let a = {
    t:12,
    s:89
}

let b = {
    t:122,
    s:899,
    m :'asdf'
}

let ss = {},rr=[];

ss.a = a;
ss.b = b;

rr.push(a);
rr.push(b);

//ss.a.t = 777
delete ss['a']
ss.b.ttt = 'ttt'

console.log(ss)
console.log(rr)

