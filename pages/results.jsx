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

import React from 'react';

import LinearProgress from '@material-ui/core/LinearProgress';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Alert from '@material-ui/lab/Alert';

const http = require('http');


export default function Results(props) {

  const {
    username,
    startDateText,
    endDateText,
    previousLimit,
    currentLimit,
    runAgain
  } = props;

  const [progress, setProgress] = React.useState(0);
  const [progressMessage, setProgressMessage] = React.useState("Loading...");
  const [resultText, setResultText] = React.useState([]); // Array that contains all of the information for the results
  const [errorMessage, setErrorMessage] = React.useState("");
  const [startTimeState, setStartTimeState] = React.useState(0);
  const [update, setUpdate] = React.useState(0);

  var startDate;
  var endDate;
  var previousDates = []; // 2D array that contains the start date and end date for each week included in the "previous" section
  var currentDates = []; // 2D array that contains the start date and end date for each week included in the "current" section
  var songs = []; // Array of all songs. Each song is an object containing an artist, name, playcount, url and also a "previousTotal" and "currentTotal"
  var results = []; // Array of songs that pass the parameters and will be included in the output
  var startTimeCalculations;

  
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
    let date = new Date(dateText);
    let timeStamp = Math.round(date.getTime()/1000);
    if (isNaN(timeStamp)) {
      setErrorMessage("Invalid date");
    }
    return Math.round(date.getTime()/1000);
  }
  
  // Create a 2D array that contains the start and end dates of weeks for either the "previous" or "current" section
  function getDates(startDate, endDate, callback) {
  
    var dates = []; // This array will be sent into the callback and be assigned to either previousDates or currentDates
  
    // Gets list of available charts for this user, expressed as date ranges
    http.get('https://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user='+ username +
      '&api_key=' + process.env.LASTFM_API_KEY + '&format=json', (resp) => {
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
      setErrorMessage("Error: " + err.message);
    });
  }
  
  // Get songs for a specific week
  // dateNumber represents which week it is, with 0 being the earliest week and each following week being incremented by 1
  // isPrevious represents whether this week is included in the "previous" section or "current" section
  function getSongs(dateNumber, isPrevious, callback) {
  
    var start; // Date of beginning of week
    var end; // Date of end of week
    let progressNum = dateNumber + (isPrevious ? 0 : previousDates.length);
    
    if (progressNum == 0) {
      startTimeCalculations = Date.now()
      setStartTimeState(startTimeCalculations)
    } else {
      let currentTime = Date.now();
      let timeDiff = currentTime - startTimeCalculations;
      let estimatedTotalTime = timeDiff/progressNum*(previousDates.length + currentDates.length);
      let secondsLeft = parseInt((estimatedTotalTime - timeDiff)/1000);
      if (secondsLeft >= 60) {
        let minutesLeft = parseInt(secondsLeft/60);
        setProgressMessage("Estimated time left: " + minutesLeft + " minute" + (minutesLeft === 1 ? "" : "s"));
      } else {
        setProgressMessage("Estimated time left: " + secondsLeft + " second" + (secondsLeft === 1 ? "" : "s"));
      }
    }
    setProgress(progressNum/(previousDates.length + currentDates.length)*100)
  
    // Find beginning and end dates of the week
    if (isPrevious) {
      start = previousDates[dateNumber][0];
      end = previousDates[dateNumber][1];
    } else {
      start = currentDates[dateNumber][0];
      end = currentDates[dateNumber][1];
    }
  
    http.get('https://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user='+ username +
      '&from=' + start + '&to=' + end + '&api_key=' + process.env.LASTFM_API_KEY + '&format=json', (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
  
      // Get list of songs in the week
      var chart = JSON.parse(data).weeklytrackchart;
      if (chart != undefined) {
        // Add each song to the big array of all the songs 
          for (var i = 0; i < chart.track.length; i++) {
            var song = chart.track[i];
            song["previousTotal"] = 0;
            song["currentTotal"] = 0;
            addSong(song, isPrevious);
        }
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
      setErrorMessage("Error: " + err.message);
    });
  }
  
  // This is the main calculation function and shows the general path that the program goes through
  function calculateDates() {
    
    getDates(startDate, endDate, function(previousDates1) {
      getDates(endDate, new Date(), function(currentDates1) {
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
  
    let resultTextArray = [];
    for (var i = 0; i < results.length; i++) {
      resultTextArray[i] = new Array(results[i].name, results[i].artist['#text'], results[i].previousTotal, results[i].currentTotal);
    }
    setResultText(resultTextArray);
    setProgress(100);
  
    // Reset variables and prepare to the run the program again
    songs = [];
    results = [];
    previousDates = [];
    currentDates = [];
  }

  React.useEffect(() => {
    setProgress(0);
    setProgressMessage("Loading...");
    setResultText([]);
    setErrorMessage("");
    setStartTimeState(0);
    startDate = dateToTS(startDateText);
    endDate = dateToTS(endDateText);
    calculateDates();
  }, [runAgain])

  return (
    <div className="resultContainer">
      {errorMessage.length > 0 ? (
        <Alert className="errorMessage" severity="error">{errorMessage}</Alert>
      ) : (
        <>
          {progress !== 100 &&
            <p className="progressMessage">{progressMessage}</p>
          }
          {startTimeState > 0 &&
            <LinearProgress className="linearProgress" variant="determinate"  value={progress} />
          }
          {progress === 100 &&
            (resultText.length > 0 ?
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><b>Song name</b></TableCell>
                    <TableCell><b>Artist</b></TableCell>
                    <TableCell><b>Previous total</b></TableCell>
                    <TableCell><b>Current total</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resultText.map((row) => (
                    <TableRow key={row[0]}>
                      <TableCell component="th" scope="row"> {row[0]} </TableCell>
                      <TableCell>{row[1]}</TableCell>
                      <TableCell>{row[2]}</TableCell>
                      <TableCell>{row[3]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            :
            <p>No results found</p>
            )
          }
        </>
      )}  
    </div>
  )
}
