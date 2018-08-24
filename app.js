const http = require('http');

var stdin = process.openStdin();

console.log('Enter your username:');
stdin.addListener("data", function(d) {

	let username = d.toString().trim();
    
	// http.get('http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user='+ username +
	// 	'&limit=3000&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user='+ username +
		'&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {//'
	  let data = '';

	  // A chunk of data has been recieved.
	  resp.on('data', (chunk) => {
	    data += chunk;
	  });

	  // The whole response has been received. Print out the result.
	  resp.on('end', () => {

	    console.log(data);
		// console.log(JSON.parse(data).toptracks.track[1].name);
		// console.log(JSON.parse(data).toptracks.track[1].name);



	  }); 


	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	});


});

