import re,sys
def S(f):
  t=open(f).read()
  return set(m.group(0) for m in re.finditer(r'"(?:[^"\\\n]|\\.){3,}"|`(?:[^`\\]|\\.){3,}`',t))
a,b=S('live.min.js'),S('rebuild.min.js')
norm=lambda x:x.strip('"`').strip()
na={norm(x) for x in a}; nb={norm(x) for x in b}
print('ONLY LIVE',len(na-nb)); [print('  L:',x[:160]) for x in sorted(na-nb)]
print('ONLY REBUILD',len(nb-na)); [print('  R:',x[:160]) for x in sorted(nb-na)]
