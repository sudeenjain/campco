<?php
/* Receives enquiry forms from the chatbot (chatbot.js -> CampcoBotConfig.formUrl) and emails them.
   Upload next to your site, then set  formUrl: 'https://YOUR-SITE/server/enquiry.php'
   Edit the three settings below. Needs PHP 7.4+ and a working mail() (or swap in your SMTP library). */

$TO       = 'info@campco.org';                 // where enquiries are delivered
$FROM     = 'chatbot@campco.org';              // must be an address on YOUR domain (SPF/DKIM) or mail may be rejected
$ORIGINS  = ['https://campco.org', 'https://www.campco.org'];   // sites allowed to post here ('http://localhost:8000' for testing)
$LOG_FILE = __DIR__ . '/enquiries.log.jsonl';  // set '' to disable. KEEP THIS FILE OUT OF THE WEB ROOT or block it in .htaccess
$RATE_DIR = sys_get_temp_dir() . '/campco-bot-rate';
$MAX_PER_HOUR = 5;                             // per IP

$FORMS = [  // allowed forms and fields (anything else is dropped)
  'callback'    => ['name', 'phone', 'topic', 'time'],
  'distributor' => ['name', 'phone', 'email', 'city', 'business'],
  'bulk'        => ['name', 'company', 'phone', 'email', 'product', 'quantity'],
  'visit'       => ['name', 'phone', 'group', 'size', 'date'],
];

header('X-Content-Type-Options: nosniff');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
  if (!in_array($origin, $ORIGINS, true)) { http_response_code(403); exit; }
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }

function fail($code, $msg) { http_response_code($code); header('Content-Type: application/json'); echo json_encode(['ok' => false, 'error' => $msg]); exit; }
function clean($s, $max) {
  $s = is_string($s) ? $s : '';
  $s = preg_replace('/[\x00-\x1F\x7F<>]+/u', ' ', $s);
  $s = trim(preg_replace('/\s+/u', ' ', $s));
  return mb_substr($s, 0, $max);
}

$raw = file_get_contents('php://input', false, null, 0, 8192);   // chatbot sends JSON as text/plain (no CORS preflight)
$in = json_decode($raw ?: '', true);
if (!is_array($in)) fail(400, 'bad json');
if (!empty($in['website'])) { http_response_code(200); echo json_encode(['ok' => true]); exit; }   // honeypot: bots fill it, people never see it

$form = $in['form'] ?? '';
if (!isset($FORMS[$form])) fail(400, 'unknown form');
$fields = [];
foreach ($FORMS[$form] as $k) $fields[$k] = clean($in['fields'][$k] ?? '', 160);
if ($fields['name'] === '') fail(422, 'name required');
$phoneDigits = preg_replace('/\D+/', '', $fields['phone'] ?? '');
if (isset($fields['phone']) && !preg_match('/^[2-9]\d{9}$/', substr($phoneDigits, -10))) fail(422, 'valid phone required');
if (!empty($fields['email']) && !filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) fail(422, 'bad email');

/* crude per-IP rate limit */
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
@mkdir($RATE_DIR, 0700, true);
$rf = $RATE_DIR . '/' . md5($ip);
$hits = array_filter(is_file($rf) ? (array) json_decode((string) @file_get_contents($rf), true) : [], function ($t) { return $t > time() - 3600; });
if (count($hits) >= $MAX_PER_HOUR) fail(429, 'too many requests');
$hits[] = time(); @file_put_contents($rf, json_encode(array_values($hits)), LOCK_EX);

$body = "New chatbot enquiry: $form\nReceived: " . date('c') . "\nLanguage: " . clean($in['lang'] ?? '', 5) . "\nPage: " . clean($in['page'] ?? '', 200) . "\n\n";
foreach ($fields as $k => $v) $body .= str_pad(ucfirst($k), 12) . ': ' . $v . "\n";
$subject = 'Website chat enquiry - ' . $form . ' - ' . $fields['name'];
$headers = "From: $FROM\r\nContent-Type: text/plain; charset=UTF-8\r\n";
if (!empty($fields['email'])) $headers .= 'Reply-To: ' . $fields['email'] . "\r\n";   // already validated, so no header injection
$sent = @mail($TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

if ($LOG_FILE) @file_put_contents($LOG_FILE, json_encode(['t' => date('c'), 'ip' => $ip, 'form' => $form, 'fields' => $fields, 'mailed' => $sent], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
if (!$sent && !$LOG_FILE) fail(500, 'mail failed');
header('Content-Type: application/json');
echo json_encode(['ok' => true]);
