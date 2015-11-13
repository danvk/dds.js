/// <reference path="typings/underscore/underscore.d.ts" />
var list = [{ a: 1 }, { b: 2 }, { a: 3, c: 4 }];
_.find(list, function (x) { return 'a' in x; }); // OK
_.find(list, 'a');
_.find(list, { a: 3 });
