from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900})
  calls=[]
  def h(route,req):
    calls.append((req.method,req.url.replace('http://localhost:8799',''),req.post_data))
    route.fulfill(status=200,content_type='application/json',body='{"url":"about:blank#stripe-stub"}')
  pg.route('**/.netlify/functions/**',h)
  pg.goto('http://localhost:8799/',wait_until='networkidle')
  btns=pg.eval_on_selector_all('button,a',"a=>a.map(x=>x.textContent.trim()).filter(t=>/Bundle|Checkout|waitlist|Cover Design/i.test(t))")
  print('buttons',btns)
  el=pg.locator('button:has-text("Get Studio Bundle")').first
  if el.count(): el.click(); pg.wait_for_timeout(1500)
  print(json.dumps(calls,indent=1)); b.close()
