var fs = require('fs');
var content = fs.readFileSync('./png', 'utf-8');
// var buff = new Buffer(content.replace(/^data:image\/png;base64,/,""));
fs.writeFile('./base64.png', content.replace(/^data:image\/png;base64,/,""), 'base64', function (err) {
	if (err) console.log(err);
	else console.log('success');
})