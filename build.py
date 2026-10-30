s=open('index.src.html').read(); e=open('engine.js').read()
assert '/*__ENGINE__*/' in s
open('index.html','w').write(s.replace('/*__ENGINE__*/',e))
print(len(open('index.html').read()))
