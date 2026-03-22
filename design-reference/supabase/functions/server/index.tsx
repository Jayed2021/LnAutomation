import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { setupSQL } from "./setup.tsx";

const app = new Hono();

// Server version: 2.0.1 (Fixed JWT validation with anon key - deployed)
// Initialize Supabase client (Updated: Fixed JWT auth validation)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Service role client for admin operations (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Anon client for auth validation (validates user JWTs)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Middleware to verify auth token and get user
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  
  console.log('Auth middleware - Authorization header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Auth middleware - No valid Authorization header');
    return c.json({ error: 'Unauthorized - Missing token' }, 401);
  }

  const token = authHeader.split(' ')[1];
  console.log('Auth middleware - Token length:', token?.length);
  
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    console.error('Auth middleware - Token validation failed:', error?.message || 'No user');
    return c.json({ error: 'Unauthorized - Invalid JWT: ' + (error?.message || 'No user found') }, 401);
  }

  console.log('Auth middleware - User authenticated:', user.id);

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Auth middleware - Profile fetch failed:', profileError?.message);
    return c.json({ error: 'User profile not found' }, 404);
  }

  console.log('Auth middleware - User profile loaded, role:', profile.role);

  // Attach user and profile to context
  c.set('user', user);
  c.set('profile', profile);
  
  await next();
};

// Health check endpoint
app.get("/make-server-4e2781f4/health", (c) => {
  return c.json({ 
    status: "ok", 
    version: "2.0.1-jwt-fix",
    timestamp: new Date().toISOString(),
    auth_client: "anon_key"
  });
});

// ============================================================================
// DATABASE SETUP (One-time setup endpoint)
// ============================================================================

app.post("/make-server-4e2781f4/setup/database", async (c) => {
  try {
    console.log('Starting database setup...');
    
    // Instead of executing raw SQL, we'll create tables one by one using Supabase client
    // This is more reliable in the Figma Make environment
    
    // First, let's check if tables already exist by trying to query user_profiles
    const { data: existingCheck, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    // If no error or error is not "relation does not exist", tables might already exist
    if (!checkError || checkError.code !== '42P01') {
      console.log('Tables may already exist');
      return c.json({ 
        success: true, 
        message: 'Database tables already exist or setup completed',
        hint: 'Proceed to create admin user',
        next_steps: [
          'Create your first admin user via /setup/create-admin',
          'Log in with your admin credentials',
          'Configure WooCommerce integration in Settings'
        ]
      });
    }

    // Execute setup SQL using the PostgreSQL connection
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return c.json({ 
        error: 'Database URL not configured',
        hint: 'Please contact support - SUPABASE_DB_URL environment variable is missing'
      }, 500);
    }

    try {
      const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
      const client = new Client(dbUrl);
      
      await client.connect();
      console.log('Connected to database');
      
      // Split the SQL into individual statements and execute them
      const statements = setupSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      console.log(`Executing ${statements.length} SQL statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt) {
          try {
            await client.queryArray(stmt + ';');
            if (i % 10 === 0) {
              console.log(`Progress: ${i}/${statements.length} statements executed`);
            }
          } catch (stmtError: any) {
            // Ignore "already exists" errors
            if (!stmtError.message?.includes('already exists')) {
              console.error(`Error executing statement ${i}:`, stmtError.message);
              console.error('Statement:', stmt.substring(0, 100));
            }
          }
        }
      }
      
      console.log('Database schema created successfully');
      await client.end();

      return c.json({ 
        success: true, 
        message: 'Database setup completed successfully',
        next_steps: [
          'Create your first admin user via /setup/create-admin',
          'Log in with your admin credentials',
          'Configure WooCommerce integration in Settings'
        ]
      });
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      throw new Error(`Database connection failed: ${dbError.message}`);
    }
  } catch (error: any) {
    console.error('Database setup error:', error);
    return c.json({ 
      error: 'Database setup failed', 
      details: error.message,
      hint: 'Check server logs for more details. You may need to run the SQL manually in Supabase dashboard.',
      stack: error.stack 
    }, 500);
  }
});

// Create initial admin user (public endpoint for first-time setup)
app.post("/make-server-4e2781f4/setup/create-admin", async (c) => {
  try {
    const { email, password, full_name } = await c.req.json();

    if (!email || !password || !full_name) {
      return c.json({ error: 'Missing required fields: email, password, full_name' }, 400);
    }

    // Check if any admin users exist
    const { data: existingAdmins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0) {
      return c.json({ 
        error: 'Admin user already exists. Use the regular signup endpoint.',
        hint: 'If you need to create another admin, log in as admin and use the user management feature.'
      }, 400);
    }

    // Create the admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth error creating admin:', authError);
      return c.json({ error: authError.message }, 400);
    }

    // Create admin profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authData.user.id,
        email,
        full_name,
        role: 'admin',
        is_active: true,
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: 'Failed to create admin profile: ' + profileError.message }, 500);
    }

    return c.json({ 
      success: true,
      message: 'Admin user created successfully!',
      user: {
        email: profileData.email,
        full_name: profileData.full_name,
        role: profileData.role
      },
      next_steps: [
        'Go to /login and sign in with your credentials',
        'Configure your store settings',
        'Set up WooCommerce integration',
        'Create additional users if needed'
      ]
    });
  } catch (error: any) {
    console.error('Admin creation error:', error);
    return c.json({ error: error.message || 'Failed to create admin' }, 500);
  }
});

// Check setup status
app.get("/make-server-4e2781f4/setup/status", async (c) => {
  try {
    // Check if user_profiles table exists
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    const tablesExist = !profilesError || profilesError.code !== '42P01'; // 42P01 = undefined_table

    // Check if admin exists
    let adminExists = false;
    if (tablesExist) {
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);
      adminExists = admins && admins.length > 0;
    }

    return c.json({
      database_setup: tablesExist,
      admin_user_exists: adminExists,
      ready_to_use: tablesExist && adminExists,
      next_action: !tablesExist 
        ? 'Run POST /setup/database to create tables'
        : !adminExists
        ? 'Run POST /setup/create-admin to create your first admin user'
        : 'System is ready! Go to /login to sign in'
    });
  } catch (error: any) {
    console.error('Setup status check error:', error);
    return c.json({ 
      error: 'Failed to check setup status',
      details: error.message 
    }, 500);
  }
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Sign up new user
app.post("/make-server-4e2781f4/auth/signup", async (c) => {
  try {
    const { email, password, full_name, role } = await c.req.json();

    if (!email || !password || !full_name || !role) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since we don't have email server configured
    });

    if (authError) {
      console.error('Auth error during signup:', authError);
      return c.json({ error: authError.message }, 400);
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authData.user.id,
        email,
        full_name,
        role,
        is_active: true,
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: 'Failed to create user profile' }, 500);
    }

    return c.json({ 
      success: true, 
      user: authData.user,
      profile: profileData 
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return c.json({ error: error.message || 'Signup failed' }, 500);
  }
});

// Get current user session
app.get("/make-server-4e2781f4/auth/me", authMiddleware, async (c) => {
  const profile = c.get('profile');
  return c.json({ profile });
});

// ============================================================================
// USER MANAGEMENT (Admin only)
// ============================================================================

// List all users
app.get("/make-server-4e2781f4/users", authMiddleware, async (c) => {
  const profile = c.get('profile');
  
  if (profile.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }

  return c.json({ users: data });
});

// Create new user (Admin only)
app.post("/make-server-4e2781f4/users", authMiddleware, async (c) => {
  const profile = c.get('profile');
  
  if (profile.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const { email, password, full_name, role } = await c.req.json();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return c.json({ error: authError.message }, 400);
    }

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{ id: authData.user.id, email, full_name, role, is_active: true }])
      .select()
      .single();

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: 'Failed to create user profile' }, 500);
    }

    return c.json({ success: true, user: profileData });
  } catch (error: any) {
    console.error('User creation error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update user
app.put("/make-server-4e2781f4/users/:id", authMiddleware, async (c) => {
  const profile = c.get('profile');
  
  if (profile.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const userId = c.req.param('id');
  const updates = await c.req.json();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }

  return c.json({ success: true, user: data });
});

// ============================================================================
// WOOCOMMERCE INTEGRATION (SIMPLIFIED - NO AUTH REQUIRED FOR PRIVATE USE)
// ============================================================================

// Simplified product sync - accepts credentials in request body
app.post("/make-server-4e2781f4/woo/sync-products-simple", async (c) => {
  try {
    const { store_url, consumer_key, consumer_secret } = await c.req.json();
    
    if (!store_url || !consumer_key || !consumer_secret) {
      return c.json({ error: 'Missing WooCommerce credentials' }, 400);
    }

    // Fetch ALL products from WooCommerce API (paginated)
    const wooAuth = btoa(`${consumer_key}:${consumer_secret}`);
    let allProducts = [];
    let page = 1;
    let hasMore = true;
    
    console.log('Starting product sync from WooCommerce...');
    console.log('Store URL:', store_url);
    console.log('Auth string length:', wooAuth.length);
    console.log('Consumer key starts with:', consumer_key.substring(0, 10));
    
    while (hasMore) {
      // Use query parameters for authentication instead of headers
      // This is more reliable and what most integrations (like Google Sheets) use
      const wooUrl = `${store_url}/wp-json/wc/v3/products?consumer_key=${encodeURIComponent(consumer_key)}&consumer_secret=${encodeURIComponent(consumer_secret)}&per_page=100&page=${page}`;
      
      console.log(`Fetching products from: ${wooUrl.replace(consumer_secret, '***SECRET***')}`);
      
      // Don't send Authorization header - use query params only
      const response = await fetch(wooUrl);

      console.log(`WooCommerce API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WooCommerce API error response:', errorText);
        
        // Try to parse as JSON for better error message
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = JSON.stringify(errorJson, null, 2);
        } catch (e) {
          // Not JSON, use text as is
        }
        
        return c.json({ 
          error: `WooCommerce API error (${response.status}): ${errorMessage}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            url: wooUrl,
            response: errorText
          }
        }, response.status);
      }

      const products = await response.json();
      
      if (products.length === 0) {
        hasMore = false;
      } else {
        allProducts = allProducts.concat(products);
        console.log(`Fetched page ${page}, total products so far: ${allProducts.length}`);
        page++;
      }
      
      // Safety limit to prevent infinite loops
      if (page > 100) {
        console.log('Reached page limit (100 pages = 10,000 products max)');
        hasMore = false;
      }
    }
    
    console.log(`Total products fetched: ${allProducts.length}`);
    
    // Process and import products with Name, SKU, Category, Regular Price
    const skusToInsert = [];
    
    for (const product of allProducts) {
      if (product.type === 'simple') {
        skusToInsert.push({
          sku: product.sku || `WOO-${product.id}`,
          sku_name: product.name,
          product_id: product.id,
          category: product.categories?.[0]?.name || 'Uncategorized',
          regular_price: parseFloat(product.regular_price) || 0,
          image_url: product.images?.[0]?.src || null,
          sync_source: 'woocommerce',
        });
      } else if (product.type === 'variable' && product.variations && product.variations.length > 0) {
        // Fetch variations
        const variationsUrl = `${store_url}/wp-json/wc/v3/products/${product.id}/variations?consumer_key=${encodeURIComponent(consumer_key)}&consumer_secret=${encodeURIComponent(consumer_secret)}&per_page=100`;
        const variationsResponse = await fetch(variationsUrl);
        
        if (variationsResponse.ok) {
          const variations = await variationsResponse.json();
          
          for (const variation of variations) {
            skusToInsert.push({
              sku: variation.sku || `WOO-${product.id}-${variation.id}`,
              sku_name: `${product.name} - ${variation.attributes.map((a: any) => a.option).join(', ')}`,
              product_id: product.id,
              variation_id: variation.id,
              category: product.categories?.[0]?.name || 'Uncategorized',
              regular_price: parseFloat(variation.regular_price) || parseFloat(product.regular_price) || 0,
              image_url: variation.image?.src || product.images?.[0]?.src || null,
              sync_source: 'woocommerce',
            });
          }
        }
      }
    }

    console.log(`Total SKUs to insert/update: ${skusToInsert.length}`);

    // Upsert SKUs (insert or update if exists)
    const { data: insertedSkus, error: insertError } = await supabase
      .from('skus')
      .upsert(skusToInsert, { onConflict: 'sku', ignoreDuplicates: false })
      .select();

    if (insertError) {
      console.error('Error inserting SKUs:', insertError);
      return c.json({ error: 'Failed to import products: ' + insertError.message }, 500);
    }

    return c.json({ 
      success: true, 
      imported: insertedSkus?.length || 0,
      message: `Successfully synced ${insertedSkus?.length || 0} products from WooCommerce`
    });
  } catch (error: any) {
    console.error('WooCommerce product sync error:', error);
    return c.json({ error: error.message || 'Product sync failed' }, 500);
  }
});

// Simplified order sync - accepts credentials in request body
app.post("/make-server-4e2781f4/woo/sync-orders-simple", async (c) => {
  try {
    const { store_url, consumer_key, consumer_secret } = await c.req.json();
    
    if (!store_url || !consumer_key || !consumer_secret) {
      return c.json({ error: 'Missing WooCommerce credentials' }, 400);
    }

    console.log('Starting order sync from WooCommerce (recent 100 orders)...');

    const wooAuth = btoa(`${consumer_key}:${consumer_secret}`);
    // Only sync the 100 most recent orders (sorted by date, newest first)
    const wooUrl = `${store_url}/wp-json/wc/v3/orders?consumer_key=${encodeURIComponent(consumer_key)}&consumer_secret=${encodeURIComponent(consumer_secret)}&per_page=100&orderby=date&order=desc`;
    
    const response = await fetch(wooUrl);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WooCommerce API error: ${response.statusText} - ${errorText}`);
    }

    const wooOrders = await response.json();
    console.log(`Fetched ${wooOrders.length} recent orders from WooCommerce`);
    
    // Process and import orders
    let successCount = 0;
    for (const wooOrder of wooOrders) {
      // Check if customer exists, create if not
      let customerId = null;
      if (wooOrder.customer_id > 0) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('woo_customer_id', wooOrder.customer_id)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert([{
              woo_customer_id: wooOrder.customer_id,
              email: wooOrder.billing.email,
              phone: wooOrder.billing.phone,
              name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
              address: wooOrder.billing.address_1,
              city: wooOrder.billing.city,
              postal_code: wooOrder.billing.postcode,
              sync_source: 'woocommerce',
            }])
            .select()
            .single();
          
          customerId = newCustomer?.id || null;
        }
      }

      // Map WooCommerce status to internal CS status
      const csStatusMap: Record<string, string> = {
        'pending': 'new_not_called',
        'processing': 'not_printed',
        'on-hold': 'awaiting_payment',
        'completed': 'delivered',
        'cancelled': 'refund',
        'refunded': 'refund',
        'failed': 'refund',
      };

      const orderData = {
        woo_order_id: wooOrder.id,
        order_number: wooOrder.number,
        customer_id: customerId,
        customer_name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
        customer_email: wooOrder.billing.email,
        customer_phone: wooOrder.billing.phone,
        status: wooOrder.status,
        cs_status: csStatusMap[wooOrder.status] || 'new_not_called',
        subtotal: parseFloat(wooOrder.total) - parseFloat(wooOrder.shipping_total) - parseFloat(wooOrder.total_tax),
        shipping_cost: parseFloat(wooOrder.shipping_total),
        tax: parseFloat(wooOrder.total_tax),
        discount: parseFloat(wooOrder.discount_total),
        total: parseFloat(wooOrder.total),
        currency: wooOrder.currency,
        shipping_address_1: wooOrder.shipping.address_1,
        shipping_address_2: wooOrder.shipping.address_2,
        shipping_city: wooOrder.shipping.city,
        shipping_state: wooOrder.shipping.state,
        shipping_postcode: wooOrder.shipping.postcode,
        shipping_country: wooOrder.shipping.country,
        source: 'woocommerce',
        created_date: wooOrder.date_created.split('T')[0],
        paid_date: wooOrder.date_paid || null,
        sync_source: 'woocommerce',
        last_synced_at: new Date().toISOString(),
      };

      // Upsert order
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .upsert([orderData], { onConflict: 'woo_order_id' })
        .select()
        .single();

      if (orderError) {
        console.error(`Error importing order ${wooOrder.id}:`, orderError);
        continue;
      }

      // Import order items
      const orderItems = wooOrder.line_items.map((item: any) => {
        // Find SKU in our database
        const skuCode = item.sku || `WOO-${item.product_id}${item.variation_id ? `-${item.variation_id}` : ''}`;
        
        return {
          order_id: insertedOrder.id,
          sku: skuCode,
          sku_name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: parseFloat(item.total),
        };
      });

      // Delete existing items and insert new ones
      await supabase.from('order_items').delete().eq('order_id', insertedOrder.id);
      await supabase.from('order_items').insert(orderItems);
      
      successCount++;
    }

    console.log(`Successfully imported ${successCount} orders`);

    return c.json({ 
      success: true, 
      imported: successCount,
      message: `Successfully synced ${successCount} recent orders (last 100 from WooCommerce)`
    });
  } catch (error: any) {
    console.error('WooCommerce order sync error:', error);
    return c.json({ error: error.message || 'Order sync failed' }, 500);
  }
});

// ============================================================================
// WOOCOMMERCE INTEGRATION (ORIGINAL - WITH AUTH)
// ============================================================================

// Get WooCommerce settings
app.get("/make-server-4e2781f4/woo/settings", authMiddleware, async (c) => {
  const profile = c.get('profile');
  
  if (!['admin', 'operations_manager'].includes(profile.role)) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  const { data, error } = await supabase
    .from('woo_settings')
    .select('id, store_url, last_sync_products, last_sync_orders, auto_sync_enabled, sync_interval_minutes')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error fetching WooCommerce settings:', error);
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }

  return c.json({ settings: data || null });
});

// Save WooCommerce settings
app.post("/make-server-4e2781f4/woo/settings", authMiddleware, async (c) => {
  const profile = c.get('profile');
  
  console.log('WooCommerce settings save request - User role:', profile.role);
  
  if (profile.role !== 'admin') {
    console.error('Access denied - admin role required, current role:', profile.role);
    return c.json({ error: 'Admin access required. Your role: ' + profile.role }, 403);
  }

  try {
    const body = await c.req.json();
    const { store_url, consumer_key, consumer_secret, auto_sync_enabled, sync_interval_minutes } = body;
    
    console.log('Attempting to save WooCommerce settings for store:', store_url);

    // Check if settings exist
    const { data: existing, error: fetchError } = await supabase
      .from('woo_settings')
      .select('id')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for first time)
      console.error('Error checking existing settings:', fetchError);
      return c.json({ error: 'Database error: ' + fetchError.message }, 500);
    }

    let result;
    if (existing) {
      console.log('Updating existing settings with id:', existing.id);
      // Update existing
      result = await supabase
        .from('woo_settings')
        .update({ store_url, consumer_key, consumer_secret, auto_sync_enabled, sync_interval_minutes })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      console.log('Creating new settings entry');
      // Insert new
      result = await supabase
        .from('woo_settings')
        .insert([{ store_url, consumer_key, consumer_secret, auto_sync_enabled, sync_interval_minutes }])
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving WooCommerce settings:', result.error);
      return c.json({ error: 'Failed to save settings: ' + result.error.message + ' (Code: ' + result.error.code + ')' }, 500);
    }

    console.log('WooCommerce settings saved successfully');
    return c.json({ success: true, settings: result.data });
  } catch (error: any) {
    console.error('Unexpected error saving WooCommerce settings:', error);
    return c.json({ error: 'Unexpected error: ' + error.message }, 500);
  }
});

// Sync products from WooCommerce
app.post("/make-server-4e2781f4/woo/sync-products", authMiddleware, async (c) => {
  const profile = c.get('profile');
  
  if (!['admin', 'operations_manager'].includes(profile.role)) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    // Get WooCommerce credentials
    const { data: settings, error: settingsError } = await supabase
      .from('woo_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      return c.json({ error: 'WooCommerce not configured' }, 400);
    }

    // Fetch ALL products from WooCommerce API (paginated)
    const wooAuth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    let allProducts = [];
    let page = 1;
    let hasMore = true;
    
    console.log('Starting product sync from WooCommerce...');
    
    while (hasMore) {
      const wooUrl = `${settings.store_url}/wp-json/wc/v3/products?per_page=100&page=${page}`;
      
      console.log(`Fetching products from: ${wooUrl}`);
      
      const response = await fetch(wooUrl, {
        headers: {
          'Authorization': `Basic ${wooAuth}`,
        },
      });

      console.log(`WooCommerce API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WooCommerce API error response:', errorText);
        
        // Try to parse as JSON for better error message
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = JSON.stringify(errorJson, null, 2);
        } catch (e) {
          // Not JSON, use text as is
        }
        
        return c.json({ 
          error: `WooCommerce API error (${response.status}): ${errorMessage}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            url: wooUrl,
            response: errorText
          }
        }, response.status);
      }

      const products = await response.json();
      
      if (products.length === 0) {
        hasMore = false;
      } else {
        allProducts = allProducts.concat(products);
        console.log(`Fetched page ${page}, total products so far: ${allProducts.length}`);
        page++;
      }
      
      // Safety limit to prevent infinite loops
      if (page > 100) {
        console.log('Reached page limit (100 pages = 10,000 products max)');
        hasMore = false;
      }
    }
    
    console.log(`Total products fetched: ${allProducts.length}`);
    
    // Process and import products with Name, SKU, Category, Regular Price
    const skusToInsert = [];
    
    for (const product of allProducts) {
      if (product.type === 'simple') {
        skusToInsert.push({
          sku: product.sku || `WOO-${product.id}`,
          sku_name: product.name,
          product_id: product.id,
          category: product.categories?.[0]?.name || 'Uncategorized',
          regular_price: parseFloat(product.regular_price) || 0,
          image_url: product.images?.[0]?.src || null,
          sync_source: 'woocommerce',
        });
      } else if (product.type === 'variable' && product.variations && product.variations.length > 0) {
        // Fetch variations
        const variationsUrl = `${settings.store_url}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`;
        const variationsResponse = await fetch(variationsUrl, {
          headers: { 'Authorization': `Basic ${wooAuth}` },
        });
        
        if (variationsResponse.ok) {
          const variations = await variationsResponse.json();
          
          for (const variation of variations) {
            skusToInsert.push({
              sku: variation.sku || `WOO-${product.id}-${variation.id}`,
              sku_name: `${product.name} - ${variation.attributes.map((a: any) => a.option).join(', ')}`,
              product_id: product.id,
              variation_id: variation.id,
              category: product.categories?.[0]?.name || 'Uncategorized',
              regular_price: parseFloat(variation.regular_price) || parseFloat(product.regular_price) || 0,
              image_url: variation.image?.src || product.images?.[0]?.src || null,
              sync_source: 'woocommerce',
            });
          }
        }
      }
    }

    console.log(`Total SKUs to insert/update: ${skusToInsert.length}`);

    // Upsert SKUs (insert or update if exists)
    const { data: insertedSkus, error: insertError } = await supabase
      .from('skus')
      .upsert(skusToInsert, { onConflict: 'sku', ignoreDuplicates: false })
      .select();

    if (insertError) {
      console.error('Error inserting SKUs:', insertError);
      return c.json({ error: 'Failed to import products: ' + insertError.message }, 500);
    }

    // Update last sync timestamp
    await supabase
      .from('woo_settings')
      .update({ last_sync_products: new Date().toISOString() })
      .eq('id', settings.id);

    return c.json({ 
      success: true, 
      imported: insertedSkus?.length || 0,
      message: `Successfully synced ${insertedSkus?.length || 0} products from WooCommerce`
    });
  } catch (error: any) {
    console.error('WooCommerce product sync error:', error);
    return c.json({ error: error.message || 'Product sync failed' }, 500);
  }
});

// Sync orders from WooCommerce
app.post("/make-server-4e2781f4/woo/sync-orders", authMiddleware, async (c) => {
  const profile = c.get('profile');
  
  if (!['admin', 'operations_manager', 'customer_service'].includes(profile.role)) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    const { data: settings, error: settingsError } = await supabase
      .from('woo_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      return c.json({ error: 'WooCommerce not configured' }, 400);
    }

    console.log('Starting order sync from WooCommerce (recent 100 orders)...');

    const wooAuth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    // Only sync the 100 most recent orders (sorted by date, newest first)
    const wooUrl = `${settings.store_url}/wp-json/wc/v3/orders?per_page=100&orderby=date&order=desc`;
    
    const response = await fetch(wooUrl, {
      headers: { 'Authorization': `Basic ${wooAuth}` },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.statusText}`);
    }

    const wooOrders = await response.json();
    console.log(`Fetched ${wooOrders.length} recent orders from WooCommerce`);
    
    // Process and import orders
    let successCount = 0;
    for (const wooOrder of wooOrders) {
      // Check if customer exists, create if not
      let customerId = null;
      if (wooOrder.customer_id > 0) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('woo_customer_id', wooOrder.customer_id)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert([{
              woo_customer_id: wooOrder.customer_id,
              email: wooOrder.billing.email,
              phone: wooOrder.billing.phone,
              name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
              address: wooOrder.billing.address_1,
              city: wooOrder.billing.city,
              postal_code: wooOrder.billing.postcode,
              sync_source: 'woocommerce',
            }])
            .select()
            .single();
          
          customerId = newCustomer?.id || null;
        }
      }

      // Map WooCommerce status to internal CS status
      const csStatusMap: Record<string, string> = {
        'pending': 'new_not_called',
        'processing': 'not_printed',
        'on-hold': 'awaiting_payment',
        'completed': 'delivered',
        'cancelled': 'refund',
        'refunded': 'refund',
        'failed': 'refund',
      };

      const orderData = {
        woo_order_id: wooOrder.id,
        order_number: wooOrder.number,
        customer_id: customerId,
        customer_name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
        customer_email: wooOrder.billing.email,
        customer_phone: wooOrder.billing.phone,
        status: wooOrder.status,
        cs_status: csStatusMap[wooOrder.status] || 'new_not_called',
        subtotal: parseFloat(wooOrder.total) - parseFloat(wooOrder.shipping_total) - parseFloat(wooOrder.total_tax),
        shipping_cost: parseFloat(wooOrder.shipping_total),
        tax: parseFloat(wooOrder.total_tax),
        discount: parseFloat(wooOrder.discount_total),
        total: parseFloat(wooOrder.total),
        currency: wooOrder.currency,
        shipping_address_1: wooOrder.shipping.address_1,
        shipping_address_2: wooOrder.shipping.address_2,
        shipping_city: wooOrder.shipping.city,
        shipping_state: wooOrder.shipping.state,
        shipping_postcode: wooOrder.shipping.postcode,
        shipping_country: wooOrder.shipping.country,
        source: 'woocommerce',
        created_date: wooOrder.date_created.split('T')[0],
        paid_date: wooOrder.date_paid || null,
        sync_source: 'woocommerce',
        last_synced_at: new Date().toISOString(),
      };

      // Upsert order
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .upsert([orderData], { onConflict: 'woo_order_id' })
        .select()
        .single();

      if (orderError) {
        console.error(`Error importing order ${wooOrder.id}:`, orderError);
        continue;
      }

      // Import order items
      const orderItems = wooOrder.line_items.map((item: any) => {
        // Find SKU in our database
        const skuCode = item.sku || `WOO-${item.product_id}${item.variation_id ? `-${item.variation_id}` : ''}`;
        
        return {
          order_id: insertedOrder.id,
          sku: skuCode,
          sku_name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: parseFloat(item.total),
        };
      });

      // Delete existing items and insert new ones
      await supabase.from('order_items').delete().eq('order_id', insertedOrder.id);
      await supabase.from('order_items').insert(orderItems);
      
      successCount++;
    }

    console.log(`Successfully imported ${successCount} orders`);

    // Update last sync timestamp
    await supabase
      .from('woo_settings')
      .update({ last_sync_orders: new Date().toISOString() })
      .eq('id', settings.id);

    return c.json({ 
      success: true, 
      imported: successCount,
      message: `Successfully synced ${successCount} recent orders (last 100 from WooCommerce)`
    });
  } catch (error: any) {
    console.error('WooCommerce order sync error:', error);
    return c.json({ error: error.message || 'Order sync failed' }, 500);
  }
});

// ============================================================================
// INVENTORY ROUTES
// ============================================================================

// Get all SKUs
app.get("/make-server-4e2781f4/inventory/skus", authMiddleware, async (c) => {
  const { data, error } = await supabase
    .from('skus')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching SKUs:', error);
    return c.json({ error: 'Failed to fetch SKUs' }, 500);
  }

  return c.json({ skus: data });
});

// Get stock levels (lots with remaining quantity)
app.get("/make-server-4e2781f4/inventory/stock", authMiddleware, async (c) => {
  const { data, error } = await supabase
    .from('lots')
    .select(`
      *,
      sku:skus(sku, sku_name, category, image_url),
      location:locations(location_code, location_name)
    `)
    .gt('remaining_quantity', 0)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stock:', error);
    return c.json({ error: 'Failed to fetch stock' }, 500);
  }

  return c.json({ stock: data });
});

// Get low stock items
app.get("/make-server-4e2781f4/inventory/low-stock", authMiddleware, async (c) => {
  const threshold = parseInt(c.req.query('threshold') || '20');

  const { data, error } = await supabase
    .from('lots')
    .select(`
      *,
      sku:skus(sku, sku_name, category, image_url),
      location:locations(location_code, location_name)
    `)
    .lt('remaining_quantity', threshold)
    .gt('remaining_quantity', 0)
    .order('remaining_quantity', { ascending: true });

  if (error) {
    console.error('Error fetching low stock:', error);
    return c.json({ error: 'Failed to fetch low stock' }, 500);
  }

  return c.json({ lowStock: data });
});

// ============================================================================
// ORDERS & FULFILLMENT ROUTES
// ============================================================================

// Get all orders
app.get("/make-server-4e2781f4/orders", authMiddleware, async (c) => {
  const profile = c.get('profile');
  
  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, name, email, phone),
      items:order_items(*)
    `)
    .order('created_date', { ascending: false });

  // CS can only see their assigned orders
  if (profile.role === 'customer_service') {
    query = query.or(`assigned_cs.eq.${profile.id},assigned_cs.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }

  return c.json({ orders: data });
});

// Get order by ID
app.get("/make-server-4e2781f4/orders/:id", authMiddleware, async (c) => {
  const orderId = c.req.param('id');
  const profile = c.get('profile');

  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      items:order_items(
        *,
        sku:skus(*)
      ),
      assigned_cs_profile:user_profiles!orders_assigned_cs_fkey(id, full_name, email)
    `)
    .eq('id', orderId)
    .single();

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching order:', error);
    return c.json({ error: 'Order not found' }, 404);
  }

  // CS can only view their assigned orders
  if (profile.role === 'customer_service' && data.assigned_cs && data.assigned_cs !== profile.id) {
    return c.json({ error: 'Access denied' }, 403);
  }

  return c.json({ order: data });
});

// Update order status
app.put("/make-server-4e2781f4/orders/:id/status", authMiddleware, async (c) => {
  const orderId = c.req.param('id');
  const { cs_status } = await c.req.json();

  const { data, error } = await supabase
    .from('orders')
    .update({ cs_status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating order status:', error);
    return c.json({ error: 'Failed to update order' }, 500);
  }

  return c.json({ success: true, order: data });
});

// Assign order to CS
app.put("/make-server-4e2781f4/orders/:id/assign", authMiddleware, async (c) => {
  const orderId = c.req.param('id');
  const { assigned_cs } = await c.req.json();

  const { data, error } = await supabase
    .from('orders')
    .update({ assigned_cs })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error assigning order:', error);
    return c.json({ error: 'Failed to assign order' }, 500);
  }

  return c.json({ success: true, order: data });
});

Deno.serve(app.fetch);