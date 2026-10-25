from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
import json
out={}
with sync_playwright() as p:
  b=p.chromium.launch()
  for name,base in [('live','https://quillbench.netlify.app'),('rebuild','http://localhost:8799')]:
    for w in (390,1280):
      for path in ['/','/portfolio/']:
        pg=b.new_page(viewport={'width':w,'height':900})
        reqs=[]
        pg.on('request',lambda r,reqs=reqs:reqs.append((r.method,r.url.replace(base,''))))
        pg.goto(base+path,wait_until='networkidle'); pg.wait_for_timeout(3000)
        tag=path.strip('/') or 'home'
        pg.screenshot(path=f'shots/{name}-{tag}-{w}.png',full_page=True)
        out[f'{name} {tag} {w}']=sorted(set(f'{m} {u}' for m,u in reqs if not u.startswith('http') or 'netlify' in u))
        if path=='/' and w==1280:
          out[f'{name} home links']=pg.eval_on_selector_all('a',"a=>a.map(x=>x.textContent.trim()+' -> '+x.getAttribute('href')).filter(s=>/sample|portfolio|Cover Check|FAQ/i.test(s))")
          out[f'{name} img alts']=pg.eval_on_selector_all('img',"a=>a.map(x=>x.alt).filter(Boolean)")
        if path=='/portfolio/':
          out[f'{name} portfolio robots']=pg.eval_on_selector_all('meta[name=robots]',"a=>a.map(x=>x.content)")
        pg.close()
  b.close()
json.dump(out,open('net.json','w'),indent=1)
for w in (390,1280):
  for tag in ('home','portfolio'):
    a=Image.open(f'shots/live-{tag}-{w}.png').convert('RGB'); c=Image.open(f'shots/rebuild-{tag}-{w}.png').convert('RGB')
    if a.size!=c.size: print(tag,w,'SIZE',a.size,c.size); continue
    bb=ImageChops.difference(a,c).getbbox(); print(tag,w,a.size,'diff bbox',bb)
