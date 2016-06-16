// init
var log = require('gelf-pro');

// set config
/** log.setConfig({
	fields: {facility: "example", owner: "Tom (a cat)"},
	host : '192.168.1.15' 
});*/

log.setConfig({
	fields: { facility: "example", owner: "Tom (a cat)" }, // optional; default fields for all messages 
	filter: [], // optional; filters to discard a message 
	broadcast: [], // optional; listeners of a message 
	levels: {}, // optional; default: see the levels section below  
	adapterName: 'udp', // optional; currently supported "udp" and "tcp"; default: udp 
	adapterOptions: {
		protocol: 'udp4', // udp only; optional; udp adapter: udp4, udp6; default: udp4 
		family: 4, // tcp only; optional; version of IP stack; default: 4 
		host: '192.168.1.15', // optional; default: 127.0.0.1 
		port: 12201 // optional; default: 12201 
	}
});


var extra = {tom: 'cat', jerry: 'mouse', others: {spike: 1, tyke: 1}};
 
log.info("Hello world", extra, function (err, bytesSent) {
	console.log("err: %s, bytesSent: %s", err, bytesSent);
});
log.info("Hello world", function (err, bytesSent) {
	console.log("err: %s, bytesSent: %s", err, bytesSent);
});
log.info("Hello world", extra);
log.info("Hello world");
 
log.error('Oooops.', new Error('An error message'));
log.error(new Error('An error message (log.error)'));
 
log.message(new Error('An error message (log.message)'), 3);
