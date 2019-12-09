/*
	This code makes a bar chart race showing your top songs over time. This was done using the guide found
	in https://towardsdatascience.com/step-by-step-tutorial-create-a-bar-chart-race-animation-da7d5fcd7079

	Author: Jonathan Lane-Smith
*/

const http = require('http');
const fastcsv = require('fast-csv');
const fs = require('fs');
const ws = fs.createWriteStream("out.csv");
const dateFormat = require('dateformat');

let username = "jlanesmith";
let startDateNum = 622; // I found that my earliest dates that mattered started at about 622
let dates = []; // 2D Array of start and end dates
let songs = []; // Array of songs. Each song is an object with various members, including an array of the song's total
	// cumulative scrobbles for each set of dates in the date array

getBarChartData();

// Takes a song and adds it to the songs array
function addSong(newSong, dateNumber) {
	for (let i = 0; i < songs.length; i++) {

		// If the song already exists in the array, update the playcount
		if ( (songs[i].name == newSong.name) && (songs[i].artist['#text'] == newSong.artist['#text']) ) {
			songs[i].countArray[dateNumber] =songs[i].countArray[dateNumber-1] + parseInt(newSong.playcount, 10);
			return;
		}
	}
	// If the song doesn't already exist in the array, add it to the array
	songs.push(newSong);
}

// Create a 2D array that contains the start and end dates for each week
function getDates(callback) {

	// Gets list of available charts for this user, expressed as date ranges
	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user='+ username +
		'&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
	  	let data = '';
	  	resp.on('data', (chunk) => {
	   	 data += chunk;
		});
		resp.on('end', () => {
		  	let list = JSON.parse(data).weeklychartlist;
			for (let i = startDateNum; i < list.chart.length; i++) {
				dates.push(new Array(list.chart[i].from, list.chart[i].to));
			}
			callback();
		}); 
	}).on("error", (err) => {
		console.log("Error: " + err.message);
		errorMessage = "Error: " + err.message;
	});
}

// Get songs for a specific week
// dateNumber represents which week it is, with 0 being the earliest week and each following week being incremented by 1
function getSongs(dateNumber, callback) {

	let start; // Date of beginning of week
	let end; // Date of end of week
	let progress = dateNumber + 1;
	console.log("Progress: " + progress + " of " + dates.length);

	// Find beginning and end dates of the week
	start = dates[dateNumber][0];
	end = dates[dateNumber][1];

	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user='+ username +
		'&from=' + start + '&to=' + end + '&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
		let data = '';
		resp.on('data', (chunk) => {
			data += chunk;
		});
		resp.on('end', () => {

			if (resp.statusCode != 200) {
				console.log("Response code while getting weekly song data:");
				console.log(resp.statusCode);
			}

			// Get list of songs in the week
			let chart = JSON.parse(data).weeklytrackchart;

			// Add each song to the big array of all the songs 
			if (chart !== undefined) {
				for (let i = 0; i < chart.track.length; i++) {
					let song = chart.track[i];
					song["countArray"] = [];
					song.countArray[dateNumber] = parseInt(song.playcount, 10);
					addSong(song, dateNumber);
				}	
			}
			
			// Ensure each song has the cumulative listening count
			for (let i = 0; i < songs.length; i++) {
				if (songs[i].countArray[dateNumber] === undefined) {
					songs[i].countArray[dateNumber] = songs[i].countArray[dateNumber-1];
				}
			}

			if (dateNumber + 1 == dates.length) {
				callback();
			} else {
				getSongs(dateNumber + 1, callback); // Get songs for the next week
			}
		}); 

	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	  errorMessage = "Error: " + err.message;
	});
}

// Generate the CSV file
function makeCSV() {
	
	// The CSV file will include songs as rows, and dates as columns
	let data = [[]];

	// The first row contains each of the dates
	data[0][0] = "Song";
	let dateIndexToIgnore = 0; // How many dates to skip forward (if they don't have any data)
	let dateHasData = false;

	for (let i = 0; i < dates.length; i++) {
		if (!dateHasData) {
			for (let j = 0; j < songs.length; j++) {
				if (songs[j].countArray[i] > 0) {
					dateHasData = true; // This date has data, include this date and all future dates
					break;
				}
			}
		}
		if (!dateHasData)
			dateIndexToIgnore++;
		else {		
			var date = new Date(dates[i][0]*1000);	
			data[0][i+1-dateIndexToIgnore] = dateFormat(date, "mmmm dS, yyyy");
		}
	}

	for (let i = 0; i < songs.length; i++) {
		for (let j = 0; j < dateIndexToIgnore; j++) {
			songs[i].countArray.shift(); // Remove data for dates in which data doesn't exist
		}
		data[i+1] = songs[i].countArray;
		data[i+1].unshift(songs[i].name); // The first column contains each of the songs' names
	}
	
	fastcsv.write(data, { headers: true }).pipe(ws); // Write to CSV
	
}

// This is the main calculation function and shows the general path that the program goes through
function getBarChartData() {
	
	getDates( function(){
		getSongs(0, function(){
			makeCSV();
		});
	});
}

