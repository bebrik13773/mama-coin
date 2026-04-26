#!/usr/bin/env python3
import os, sys

db  = os.environ.get('MC_DB_PASS', '')
jwt = os.environ.get('MC_JWT_SECRET', '')
fcm = os.environ.get('MC_FCM_KEY', '')

print("DB_PASS len=" + str(len(db)) + ", JWT_SECRET len=" + str(len(jwt)))
if not jwt:
    print("ERROR: JWT_SECRET is empty! Add it to GitHub Secrets")
    sys.exit(1)

lines = [
    "<?php",
    "define('DB_HOST',          'sql203.infinityfree.com');",
    "define('DB_NAME',          'if0_41745763_app');",
    "define('DB_USER',          'if0_41745763');",
    "define('DB_PASS',          '" + db + "');",
    "define('DB_CHARSET',       'utf8mb4');",
    "define('JWT_SECRET',       '" + jwt + "');",
    "define('JWT_EXPIRE_HOURS', 720);",
    "define('FCM_SERVER_KEY',   '" + fcm + "');",
    "define('APP_URL',          'https://mama-coin.ct.ws');",
    "define('DEBUG_MODE',       false);",
]
php = "\n".join(lines) + "\n"
open('backend/config/config.php', 'w').write(php)
print("config.php generated: " + str(len(php)) + " bytes")
