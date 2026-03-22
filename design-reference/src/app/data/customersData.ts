// ─── Customer Types ───────────────────────────────────────────────────────────

export interface PrescriptionData {
  id?: string;
  order_id: string;
  date: string;
  od_sphere: string;
  od_cylinder: string;
  od_axis: string;
  os_sphere: string;
  os_cylinder: string;
  os_axis: string;
  pd: string;
  lens_type: string;
}

export interface Customer {
  customer_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  area: string;
  customer_type: 'new' | 'returning';
  first_order_date: string;
  total_orders: number;
  successful_deliveries: number;
  failed_deliveries: number;
  cancelled_orders: number;
  total_spent: number;
  avg_order_value: number;
  delivery_success_rate: number;
  prescription_data?: PrescriptionData[];
  notes?: string;
}

// ─── Mock Customer Data ───────────────────────────────────────────────────────

export const customers: Customer[] = [
  {
    customer_id: 'CUST-001',
    name: 'Anika Rahman',
    phone: '+880 1712 345678',
    email: 'anika.rahman@email.com',
    address: 'House 45, Road 12, Block C',
    city: 'Dhaka',
    area: 'Banani',
    customer_type: 'returning',
    first_order_date: '2025-08-15',
    total_orders: 8,
    successful_deliveries: 7,
    failed_deliveries: 1,
    cancelled_orders: 0,
    total_spent: 18500,
    avg_order_value: 2312,
    delivery_success_rate: 87.5,
    prescription_data: [
      {
        id: 'RX-001',
        order_id: 'ORD-2026-160',
        date: '2026-02-23',
        od_sphere: '-1.50',
        od_cylinder: '-0.50',
        od_axis: '180',
        os_sphere: '-1.75',
        os_cylinder: '-0.25',
        os_axis: '175',
        pd: '62',
        lens_type: 'Blue Light Block 1.56 AR',
      },
      {
        id: 'RX-002',
        order_id: 'ORD-2025-892',
        date: '2025-11-10',
        od_sphere: '-1.25',
        od_cylinder: '-0.50',
        od_axis: '180',
        os_sphere: '-1.50',
        os_cylinder: '-0.25',
        os_axis: '175',
        pd: '62',
        lens_type: 'CR-39 Anti-Reflective 1.56',
      },
    ],
    notes: 'Prefers delivery between 2-5 PM. Reliable customer.',
  },
  {
    customer_id: 'CUST-002',
    name: 'Rafiq Ahmed',
    phone: '+880 1812 456789',
    email: 'rafiq.ahmed@email.com',
    address: '78 Green Road',
    city: 'Dhaka',
    area: 'Dhanmondi',
    customer_type: 'returning',
    first_order_date: '2025-09-22',
    total_orders: 5,
    successful_deliveries: 5,
    failed_deliveries: 0,
    cancelled_orders: 0,
    total_spent: 12400,
    avg_order_value: 2480,
    delivery_success_rate: 100,
    prescription_data: [
      {
        id: 'RX-004',
        order_id: 'ORD-2026-145',
        date: '2026-02-15',
        od_sphere: '-2.00',
        od_cylinder: '0.00',
        od_axis: '0',
        os_sphere: '-2.25',
        os_cylinder: '0.00',
        os_axis: '0',
        pd: '64',
        lens_type: 'Progressive 1.61 AR',
      },
    ],
    notes: 'VIP customer - always orders premium products.',
  },
  {
    customer_id: 'CUST-003',
    name: 'Nusrat Jahan',
    phone: '+880 1911 567890',
    email: 'nusrat.jahan@email.com',
    address: 'Flat 3B, Skyline Apartments',
    city: 'Dhaka',
    area: 'Gulshan',
    customer_type: 'returning',
    first_order_date: '2025-07-10',
    total_orders: 12,
    successful_deliveries: 10,
    failed_deliveries: 1,
    cancelled_orders: 1,
    total_spent: 28900,
    avg_order_value: 2408,
    delivery_success_rate: 83.3,
    prescription_data: [
      {
        id: 'RX-003',
        order_id: 'ORD-2026-178',
        date: '2026-02-28',
        od_sphere: '-3.00',
        od_cylinder: '-1.00',
        od_axis: '180',
        os_sphere: '-3.25',
        os_cylinder: '-0.75',
        os_axis: '175',
        pd: '66',
        lens_type: 'Blue Light Block 1.67 AR (High Index)',
      },
    ],
    notes: 'High prescription power - always use 1.67 index lenses.',
  },
  {
    customer_id: 'CUST-004',
    name: 'Karim Hossain',
    phone: '+880 1713 678901',
    email: 'karim.h@email.com',
    address: '12 Mirpur Road',
    city: 'Dhaka',
    area: 'Mirpur',
    customer_type: 'returning',
    first_order_date: '2025-10-05',
    total_orders: 3,
    successful_deliveries: 2,
    failed_deliveries: 1,
    cancelled_orders: 0,
    total_spent: 4200,
    avg_order_value: 1400,
    delivery_success_rate: 66.7,
    notes: 'Difficult to reach. Call multiple times before dispatch.',
  },
  {
    customer_id: 'CUST-005',
    name: 'Fatima Begum',
    phone: '+880 1821 789012',
    email: 'fatima.begum@email.com',
    address: 'House 89, Sector 7',
    city: 'Dhaka',
    area: 'Uttara',
    customer_type: 'new',
    first_order_date: '2026-02-28',
    total_orders: 1,
    successful_deliveries: 0,
    failed_deliveries: 0,
    cancelled_orders: 0,
    total_spent: 1200,
    avg_order_value: 1200,
    delivery_success_rate: 0,
    notes: 'First time customer - awaiting delivery.',
  },
  {
    customer_id: 'CUST-006',
    name: 'Tanvir Islam',
    phone: '+880 1915 123456',
    email: 'tanvir.islam@email.com',
    address: 'Plot 25, Main Street',
    city: 'Dhaka',
    area: 'Bashundhara',
    customer_type: 'returning',
    first_order_date: '2025-06-20',
    total_orders: 6,
    successful_deliveries: 5,
    failed_deliveries: 1,
    cancelled_orders: 0,
    total_spent: 14800,
    avg_order_value: 2466,
    delivery_success_rate: 83.3,
    prescription_data: [
      {
        id: 'RX-005',
        order_id: 'ORD-2026-089',
        date: '2026-01-18',
        od_sphere: '-0.75',
        od_cylinder: '-0.25',
        od_axis: '90',
        os_sphere: '-1.00',
        os_cylinder: '-0.50',
        os_axis: '85',
        pd: '63',
        lens_type: 'Photochromic 1.56 AR',
      },
    ],
    notes: 'Prefers photochromic lenses. Works outdoors frequently.',
  },
  {
    customer_id: 'CUST-007',
    name: 'Sabina Khatun',
    phone: '+880 1722 987654',
    email: 'sabina.k@email.com',
    address: '56 College Road',
    city: 'Dhaka',
    area: 'Mohammadpur',
    customer_type: 'new',
    first_order_date: '2026-03-01',
    total_orders: 1,
    successful_deliveries: 1,
    failed_deliveries: 0,
    cancelled_orders: 0,
    total_spent: 2100,
    avg_order_value: 2100,
    delivery_success_rate: 100,
    notes: 'First order completed successfully. Happy with service.',
  },
  {
    customer_id: 'CUST-008',
    name: 'Mehedi Hasan',
    phone: '+880 1834 567890',
    email: 'mehedi.h@email.com',
    address: 'Apartment 12C, Skyview Tower',
    city: 'Dhaka',
    area: 'Motijheel',
    customer_type: 'returning',
    first_order_date: '2025-05-12',
    total_orders: 15,
    successful_deliveries: 14,
    failed_deliveries: 0,
    cancelled_orders: 1,
    total_spent: 32500,
    avg_order_value: 2166,
    delivery_success_rate: 93.3,
    prescription_data: [
      {
        id: 'RX-006',
        order_id: 'ORD-2026-201',
        date: '2026-03-03',
        od_sphere: '-4.50',
        od_cylinder: '-1.50',
        od_axis: '180',
        os_sphere: '-4.75',
        os_cylinder: '-1.25',
        os_axis: '175',
        pd: '65',
        lens_type: 'High Index 1.74 AR Ultra-thin',
      },
      {
        id: 'RX-007',
        order_id: 'ORD-2025-654',
        date: '2025-08-22',
        od_sphere: '-4.25',
        od_cylinder: '-1.25',
        od_axis: '180',
        os_sphere: '-4.50',
        os_cylinder: '-1.00',
        os_axis: '175',
        pd: '65',
        lens_type: 'High Index 1.67 AR',
      },
    ],
    notes: 'Very high prescription - always recommend ultra-thin lenses. Loyal customer.',
  },
];
