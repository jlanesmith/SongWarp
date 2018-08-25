function Song() {
	this.songTitle = "Title";
	this.artist = "Artist";
	this.previousTotal = 0;
	this.currentTotal = 0;
}

function addSong(songs, newSong, previousFlag) {
	let numSongs = songs.length;
	for (song in songs) {
		if ( (song.songTitle == newSong.songTitle) && (song.artist = newSong.artist) ) {
			if (previousFlag) {
				song.previousTotal++;
			} else {
				song.currentTotal++;
			}
			return songs;
		}
	}
	songs.push(newSong);
	return songs;
}

function sortBySongPreviousTotal(songs) {
	return songs.sort(function(a,b){return b.previousTotal - a.previousTotal});
}

var username;
var startDate;
var endDate;
var previousLimit;
var currentLimit;

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter your username:', (username1) => {
    rl.question('Enter a start date in the form 2018-12-25:', (startDate1) => {
    	rl.question('Enter an end date in the form 2018-12-25:', (endDate1) => {
    		rl.question('Enter a previous limit', (previousLimit1) => {
    			rl.question('Enter a current limit', (currentLimit1) => {
        			username=username1;
        			startDate=startDate1;
        			endDate=endDate1;
        			previousLimit=previousLimit1;
        			currentLimit=currentLimit1;
        			rl.close();
        			console.log("yee");
        		});
        	});
        });
    });
});


function calculate() {

	// const http = require('http');
	// http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user='+ username +
	// 	'&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {//'
	//   let data = '';

	//   // A chunk of data has been recieved.
	//   resp.on('data', (chunk) => {
	//     data += chunk;
	//   });

	//   // The whole response has been received. Print out the result.
	//   resp.on('end', () => {

	//     console.log(data);
	// 	// console.log(JSON.parse(data).toptracks.track[1].name);
		
	//   }); 

	// }).on("error", (err) => {
	//   console.log("Error: " + err.message);
	// });
}

