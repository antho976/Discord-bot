#!/usr/bin/env python3

with open(r'c:\Users\antho\Desktop\Discord bot - Copie\rpg\api\content-routes.js', 'r') as f:
    content = f.read()

# Replace all /api/ prefixes in router definitions
content = content.replace("router.get('/api/", "router.get('/")
content = content.replace("router.post('/api/", "router.post('/")
content = content.replace("router.put('/api/", "router.put('/")
content = content.replace("router.delete('/api/", "router.delete('/")

with open(r'c:\Users\antho\Desktop\Discord bot - Copie\rpg\api\content-routes.js', 'w') as f:
    f.write(content)

print('Routes fixed!')
