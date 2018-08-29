const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express()
const http = require('http');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('index', {info: null, results: null, error: null});
})

var responder;

var username;
var startDate;
var startDateText;
var endDate;
var endDateText;
var previousLimit;
var currentLimit;

var previousDates = [];
var currentDates = [];
var songs = [];
var results = [];

function getPost() {
  app.post('/', function (req, res) {
	  responder = res;
	  username = req.body.username;
	  startDateText = req.body.startDate
	  startDate = dateToTS(startDateText);
	  endDateText = req.body.endDate
	  endDate = dateToTS(endDateText);
	  previousLimit = req.body.previousLimit;
	  currentLimit = req.body.currentLimit;
	  calculateDates();
	})
}

getPost();

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

function addSong(songs, newSong, previousFlag) {
	for (var i = 0; i < songs.length; i++) {
		if ( (songs[i].name == newSong.name) && (songs[i].artist['#text'] == newSong.artist['#text']) ) {
			if (previousFlag) {
				songs[i].previousTotal += parseInt(newSong.playcount, 10);
			} else {
				songs[i].currentTotal += parseInt(newSong.playcount, 10);
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

function dateToTS(dateText) {
	var date = new Date(dateText);
	return Math.round(date.getTime()/1000);
}

function getDates(startDate, endDate, callback) {

	var dates = [];
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
	});
}

function getSongs(dateNumber, previousFlag, callback) {

	var start;
	var end;
	let progress = dateNumber + 1 + (previousFlag ? 0 : previousDates.length);
	var percentDone = progress / (previousDates.length + currentDates.length);
	console.log("Progress: " + progress + " of " + (previousDates.length + currentDates.length) );

	if (previousFlag) {
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
	  	var chart = JSON.parse(data).weeklytrackchart;
	  	for (var i = 0; i < chart.track.length; i++) {
	  		var song = chart.track[i];
	  		song["previousTotal"] = 0;
	  		song["currentTotal"] = 0;
	  		songs = addSong(songs, song, previousFlag);
	  	}
	  	var datesToCompare;
	  	if (previousFlag) {
	  		datesToCompare = previousDates;
	  	} else {
	  		datesToCompare = currentDates;
	  	}
	  	if (dateNumber + 1 == datesToCompare.length) {
	  		callback();
	  	} else {
	  		getSongs(dateNumber + 1, previousFlag, callback);
	  	}

	  }); 
	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	});
}

function calculateDates() {
	
	getDates(startDate, endDate, function(previousDates1){
		getDates(endDate, new Date(), function(currentDates1){
			previousDates = previousDates1;
			currentDates = currentDates1;
			if (previousDates.length > 0) {
				getSongs(0, true, function() {
					if (currentDates.length > 0) {
						getSongs(0, false, function() {
							outputResults();
						})
					} else {
						outputResults();
					}
				});
			} else {
				outputResults();
			}
		});
	});
}

function outputResults() {

	for (var i = 0; i < songs.length; i++) {
		if ( (songs[i].previousTotal >= previousLimit) && (songs[i].currentTotal <= currentLimit)) {
			songs[i]["artistText"] = songs[i].artist['#text'];
			results.push(songs[i]);
		}
	}
	results = sortBySongPreviousTotal(results);
	var resultText = [];
	var info = "Parameters: " + username + ", " + startDateText + ", " + endDateText + ", " + previousLimit + ", " + currentLimit;
	console.log(info);
	console.log("Results: " + results.length);
	for (var i = 0; i < results.length; i++) {	
		resultText[i] = new Array(results[i].name, results[i].artist['#text'], results[i].previousTotal, results[i].currentTotal);
	}
	responder.render('index', {info: info, results: resultText, error: null});
	getPost();
}
