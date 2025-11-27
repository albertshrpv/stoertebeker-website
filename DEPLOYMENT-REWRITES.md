### Purpose
Static Astro build with a client-side React Router under `BrowserRouter` requires web server rewrites so deep links resolve to the same HTML entry.

### Mount points
- English account: `/en/shop/account`
- German account: `/de/shop/konto`

### Nginx
```nginx
location ^~ /en/shop/account/ {
  try_files $uri $uri/ /en/shop/account/index.html;
}
location = /en/shop/account {
  try_files $uri $uri/ /en/shop/account/index.html;
}

location ^~ /de/shop/konto/ {
  try_files $uri $uri/ /de/shop/konto/index.html;
}
location = /de/shop/konto {
  try_files $uri $uri/ /de/shop/konto/index.html;
}
```

### Apache (.htaccess)
```apache
RewriteEngine On

# EN
RewriteRule ^en/shop/account$ /en/shop/account/ [R=301,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^en/shop/account/.* /en/shop/account/index.html [L]

# DE
RewriteRule ^de/shop/konto$ /de/shop/konto/ [R=301,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^de/shop/konto/.* /de/shop/konto/index.html [L]
```

### Netlify (_redirects)
Create `public/_redirects` (or in Netlify UI):
```
/en/shop/account/*   /en/shop/account/index.html   200
/de/shop/konto/*     /de/shop/konto/index.html     200
```

### Vercel (vercel.json)
```json
{
  "rewrites": [
    { "source": "/en/shop/account/:path*", "destination": "/en/shop/account/index.html" },
    { "source": "/de/shop/konto/:path*", "destination": "/de/shop/konto/index.html" }
  ]
}
```

### Cloudflare Pages (_routes.json)
```json
{
  "version": 1,
  "include": [
    "/en/shop/account/*",
    "/de/shop/konto/*"
  ],
  "exclude": []
}
```

Then add a worker/page rule to serve `index.html` for those includes.

### Caddy
```caddyfile
@enaccount path /en/shop/account/*
route @enaccount {
  try_files {path} /en/shop/account/index.html
}

@dekonto path /de/shop/konto/*
route @dekonto {
  try_files {path} /de/shop/konto/index.html
}
```

### Notes
- Keep the trailing slash handling consistent with your site. The above rules also handle the base path without a slash.
- No server adapter is required; the site remains fully static.

