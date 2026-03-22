Token: 195214343217728724723c0d50c73f227570e7e7f991fc313357

API Link
SMS Sending API URL (HTML Output): http://api.greenweb.com.bd/api.php
Or,
SMS Sending API URL (JSON Output): http://api.greenweb.com.bd/api.php?json
SSL Version: You can use https protocol
Generate Token ( From SMS panel): https://gwb.li/token
Required Parameters ( For Sending SMS): message, to, token
Request Method: POST or GET

Other API Usages:


URL: https://api.bdbulksms.net/g_api.php (প্লেইন টেক্সট আউটপুট)
URL: https://api.bdbulksms.net/g_api.php?json  (JSON আউটপুট)

ব্যালেন্স দেখতে: https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&balance
ব্যালেন্স দেখতে (JSON Format): https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&balance&json

SMS রেট দেখতে: https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&rate

টোকেন থেকে মোট কতটি SMS পাঠানো হয়েছে দেখতে: https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&tokensms

মূল অ্যাকাউন্ট থেকে মোট কতটি SMS পাঠানো হয়েছে দেখতে: https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&totalsms

মূল অ্যাকাউন্ট থেকে Current Month এ কত SMS পাঠানো হয়েছে দেখতে: https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&monthlysms

টোকেন থেকে  Current Month এ কত SMS পাঠানো হয়েছে দেখতে: https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&tokenmonthlysms

মূল অ্যাকাউন্ট থেকে  XX Month এ কত SMS পাঠানো হয়েছে দেখতে (XX এর জায়গাতে মাস-বছর ( যেমন জানুয়ারী ২০২২ এর জন্য 01-2022) ফরম্যাটে মাস উল্ল্যেখ করতে হবে): https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&monthlysms=03-2026

টোকেন থেকে  XX Month এ কত SMS পাঠানো হয়েছে দেখতে (XX এর জায়গাতে মাস-বছর ( যেমন জানুয়ারী ২০২২ এর জন্য 01-2022) ফরম্যাটে মাস উল্ল্যেখ করতে হবে): https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&tokenmonthlysms=03-2026

SMS এর মেয়াদ দেখতে: https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&expiry

সব একত্রে: https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&balance&expiry&rate&tokensms&totalsms&monthlysms&tokenmonthlysms

সব একত্রে (json): https://api.bdbulksms.net/g_api.php?token=yourtokencodehere&balance&expiry&rate&tokensms&totalsms&monthlysms&tokenmonthlysms&json
		



<form action="http://api.greenweb.com.bd/api.php" method="post">
<input type="text" name="token" placeholder="token" />
<input type="text" name="to" placeholder="+8801xxxxxxxxx,+8801xxxxxxxxx" />
<textarea class="span11" name="message" id="message" style="position: relative; left: 4%;" ></textarea>
<button type="submit" name="submit" class="btn btn-success btn-large">Send Message</button>
</form>

Send BULK SMS From NodeJS
Method 1:
You will need axios to use it

const axios = require('axios');

const greenwebsms = new URLSearchParams();
greenwebsms.append('token', 'yourtokenhere');
greenwebsms.append('to', '+88017xxxxxxx');
greenwebsms.append('message', 'test sms');
axios.post('http://api.greenweb.com.bd/api.php', greenwebsms).then(response => {
  console.log(response.data);
});
	


Mehtod 2:

var http = require('http');
var querystring = require('querystring');

var postData = querystring.stringify({
    token: 'your token code here',
    to: '+88017xxxxxxxxx',
    message: 'Test sms using API'
});

var options = {
    hostname: 'api.greenweb.com.bd',
    path: '/api.php',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
    }
};

var req = http.request(options, function (res) {
    
    res.setEncoding('utf8');

    res.on('data', function (chunk) {
        console.log('BODY:', chunk);
    });

    res.on('end', function () {
    });
});

req.on('error', function (e) {
    console.log('Problem with request:', e.message);
});

req.write(postData);
req.end();
	
