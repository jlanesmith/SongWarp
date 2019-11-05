/*
	This file contains the source code for SongBack (patent pending)

	Author: Jonathan Lane-Smith

	Brief overview: Listening information is retrieved in packets of a week is contained in a large array named `songs`.
	Brief description of steps involved:
	1. Check whether the user is valid. If the user is valid, continue and if not, output results
	2. Using the given start date and end date, calculate the start and end dates for each week in both the "previous" and "current" sections. 
	3. For each week in the "previous" section, make an http call to get every song listened to that week. These songs are added to the `songs` array.
	4. Repeat step 3, but with each week in the "current" section.
	5. Using the previousLimit and currentLimit, determine which songs pass the requirements and will be included in the results.
	6. Sort the resulting songs and output them.
*/

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const http = require('http');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('index', {info: null, results: null, error: null});
})

var responder;

var username;
var startDate; // Start date, determined from startDateText
var startDateText; // Text received through UI
var endDate; // End date, determined from endDateText
var endDateText; // Text received through UI
var previousLimit; // User must have listened to songs at least this many times before the start date
var currentLimit; // User must have listened to songs no more than this many times since the end date

var previousDates = []; // 2D array that contains the start date and end date for each week included in the "previous" section
var currentDates = []; // 2D array that contains the start date and end date for each week included in the "current" section
var songs = []; // Array of all songs. Each song is an object containing an artist, name, playcount, url and also a "previousTotal" and "currentTotal"
var results = []; // Array of songs that pass the parameters and will be included in the output

var errorMessage = null;

// Check to see if the username is valid. If it is, continue with calculations and if not, output results with an error message
function checkUser(callback) {
	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getInfo&user='+ username +
	'&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
		let data = '';
		resp.on('data', (chunk) => {
			data += chunk;
		});
		resp.on('end', () => {
			if (resp.statusCode == 500) {
				console.log("Invalid Username");
				errorMessage = "Sorry, this username is invalid.";
				outputResults();
			} else {
				callback();
			}
	 	}); 
	}).on("error", (err) => {
		console.log("Error: " + err.message);
		errorMessage = "Error: " + err.message;
	});
}

// Waits for the user to click submit and then starts error checking and doing calculations
function getPost() {
  	app.post('/', function (req, res) {
		responder = res;
		username = req.body.username;
		startDateText = req.body.startDate;
		startDate = dateToTS(startDateText);
		endDateText = req.body.endDate;
		endDate = dateToTS(endDateText);
		previousLimit = req.body.previousLimit;
		currentLimit = req.body.currentLimit;
		checkUser( function() {
			calculateDates();
  		});
	});
}

getPost();

app.listen(process.env.PORT); // Change to 3000 when debugging

// Takes a song and adds it to the songs array
function addSong(newSong, previousFlag) {
	for (var i = 0; i < songs.length; i++) {

		// If the song already exists in the array, update the playcount
		if ( (songs[i].name == newSong.name) && (songs[i].artist['#text'] == newSong.artist['#text']) ) {
			if (previousFlag) {
				songs[i].previousTotal += parseInt(newSong.playcount, 10);
			} else {
				songs[i].currentTotal += parseInt(newSong.playcount, 10);
			}
			return;
		}
	}
	// If the song doesn't already exist in the array, add it to the array
	songs.push(newSong);
}

// Converts date to time stamp
function dateToTS(dateText) {
	var date = new Date(dateText);
	return Math.round(date.getTime()/1000);
}

// Create a 2D array that contains the start and end dates of weeks for either the "previous" or "current" section
function getDates(startDate, endDate, callback) {

	var dates = []; // This array will be sent into the callback and be assigned to either previousDates or currentDates

	// Gets list of available charts for this user, expressed as date ranges
	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user='+ username +
		'&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
	  	let data = '';
	  	resp.on('data', (chunk) => {
	   	 data += chunk;
		});
		resp.on('end', () => {
		  	let list = JSON.parse(data).weeklychartlist;
			for (var i = 0; i < list.chart.length; i++) {
				if ((list.chart[i].from > startDate) && (list.chart[i].to < endDate)) {
					dates.push(new Array(list.chart[i].from, list.chart[i].to));
				}
			}
			callback(dates);
		}); 
	}).on("error", (err) => {
		console.log("Error: " + err.message);
		errorMessage = "Error: " + err.message;
	});
}

// Get songs for a specific week
// dateNumber represents which week it is, with 0 being the earliest week and each following week being incremented by 1
// isPrevious represents whether this week is included in the "previous" section or "current" section
function getSongs(dateNumber, isPrevious, callback) {

	var start; // Date of beginning of week
	var end; // Date of end of week
	let progress = dateNumber + 1 + (isPrevious ? 0 : previousDates.length);
	console.log("Progress: " + progress + " of " + (previousDates.length + currentDates.length) );

	// Find beginning and end dates of the week
	if (isPrevious) {
		start = previousDates[dateNumber][0];
		end = previousDates[dateNumber][1];
	} else {
		start = currentDates[dateNumber][0];
		end = currentDates[dateNumber][1];
	}

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
		var chart = JSON.parse(data).weeklytrackchart;
		// Add each song to the big array of all the songs 
	  	for (var i = 0; i < chart.track.length; i++) {
	  		var song = chart.track[i];
	  		song["previousTotal"] = 0;
	  		song["currentTotal"] = 0;
	  		addSong(song, isPrevious);
		}
		
		// Determine whether to go to the next week, or whether this is the last week of the section
	  	var datesToCompare;
	  	if (isPrevious) {
	  		datesToCompare = previousDates;
	  	} else {
	  		datesToCompare = currentDates;
	  	}
	  	if (dateNumber + 1 == datesToCompare.length) {
	  		callback(); // Finished either "previous" or "current" section
	  	} else {
	  		getSongs(dateNumber + 1, isPrevious, callback); // Get songs for the next week
	  	}

	  }); 
	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	  errorMessage = "Error: " + err.message;
	});
}

// This is the main calculation function and shows the general path that the program goes through
function calculateDates() {
	
	getDates(startDate, endDate, function(previousDates1){
		getDates(endDate, new Date(), function(currentDates1){
			previousDates = previousDates1;
			currentDates = currentDates1;
			if (previousDates.length > 0) {
				getSongs(0, true, function() { // Get songs contained in the "previous" section
					if (currentDates.length > 0) {
						getSongs(0, false, function() { // Get songs contained in the "current" section
							outputResults();
						})
					} else {
						outputResults();
					}
				});
			} else {
				outputResults(); // If there are no weeks contained in the previousDates array, there is no valid information
			}
		});
	});
}

// Sort results by the total number of listens during the "previous" section
function sortResultsByPreviousTotal() {
	return results.sort(function(a,b){return b.previousTotal - a.previousTotal});
}

// Output results once either the username is found to be invalid, or the calculations have been complete
function outputResults() {

	// Determine which songs pass the requirements and count towards the results
	for (var i = 0; i < songs.length; i++) {
		if ( (songs[i].previousTotal >= previousLimit) && (songs[i].currentTotal <= currentLimit)) {
			songs[i]["artistText"] = songs[i].artist['#text'];
			results.push(songs[i]);
		}
	}
	sortResultsByPreviousTotal(); // Sort results

	var resultText = []; // Array that contains all of the information for the results
	var info = "Parameters given: " + username + ", " + startDateText + ", " + endDateText + ", " + previousLimit + ", " + currentLimit;
	console.log(info);
	console.log("Results: " + results.length);
	for (var i = 0; i < results.length; i++) {
		resultText[i] = new Array(results[i].name, results[i].artist['#text'], results[i].previousTotal, results[i].currentTotal);
	}
	responder.render('index', {info: info, results: resultText, error: errorMessage});

	// Reset variables and prepare to the run the program again
	errorMessage = null;
	songs = [];
	results = [];
	previousDates = [];
	currentDates = [];
	getPost(); // Prepare the program to receive new parameters and make calculations again
}
