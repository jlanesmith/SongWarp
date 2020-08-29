/*
	This file contains the code to calculate the list of songs, and display them in a table.

	Brief overview: LastFM data is retrieved in packets of a week and is contained in a large array named `songs`.
	Brief description of steps involved:
  1. Using the given start date and end date, calculate the start and end dates for each week in both the "previous" 
     and "current" sections. 
  2. For each week in the "previous" section, make an http call to get every song listened to that week. These songs 
     are added to the `songs` array.
	3. Repeat step 2, but with each week in the "current" section.
  4. Using the previousLimit and currentLimit, determine which songs pass the requirements and will be included in 
     the results.
	5. Sort the resulting songs and output them.
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

  const [progress, setProgress] = React.useState(0); // Progress in calculations as a percentage, from 0 to 100
  const [progressMessage, setProgressMessage] = React.useState("Loading...");
  // Array that contains the information shown in the results table
  const [resultText, setResultText] = React.useState([]);
  // Error message if there is an invalid date, or an API call error
  const [errorMessage, setErrorMessage] = React.useState(""); 
  // Time when calculations begin, in order to determine estimated time left. 
  const [startTimeState, setStartTimeState] = React.useState(0); 

  let startDate; // Earliest date, to indicate the beginning of the "previous" section
  let endDate; // Date to indicate the the end of the "previous" section and beginning of the "current" section
  // 2D array that contains the start date and end date for each week included in the "previous" section
  let previousDates = []; 
  // 2D array that contains the start date and end date for each week included in the "current" section
  let currentDates = []; 
  // Array of all songs. Each song is an object containing an artist, name, playcount, url, and also a "previousTotal"
  // and "currentTotal"
  let songs = []; 
  let results = []; // Array of songs that satisfy the requirements and will be included in the output
  // startTimeState as a non-state variable, so that it updates immediately and can be used for calculations
  let startTimeCalculations; 

  
  // Takes a song and adds it to the songs array
  function addSong(newSong, previousFlag) {
    for (let i = 0; i < songs.length; i++) {
  
      // If the song already exists in the array, update the playcount
      if ( (songs[i].name == newSong.name) && (songs[i].artist['#text'] == newSong.artist['#text']) ) {
        if (previousFlag) {
          songs[i].previousTotal += parseInt(newSong.playcount);
        } else {
          songs[i].currentTotal += parseInt(newSong.playcount);
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
  
    let dates = []; // This array will be sent into the callback and be assigned to either previousDates or currentDates
  
    // Gets list of available charts for this user, expressed as date ranges
    http.get('https://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user='+ username +
    '&api_key=' + process.env.LASTFM_API_KEY + '&format=json', (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        let list = JSON.parse(data).weeklychartlist;
        for (let i = 0; i < list.chart.length; i++) {
          if ((list.chart[i].from > startDate) && (list.chart[i].from < endDate)) { // If the week is within the date ranges
            dates.push(new Array(list.chart[i].from, list.chart[i].to)); // Add the week to the dates array
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
  
    let start; // Date of beginning of week
    let end; // Date of end of week
    // Progress for calculations as a percentage, between 0 and 100
    let progressNum = dateNumber + (isPrevious ? 0 : previousDates.length); 
    
    if (progressNum == 0) { // If calculations are just starting now
      startTimeCalculations = Date.now()
      setStartTimeState(startTimeCalculations)
    } else {
      // Calculate estimated time left
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
    setProgress(progressNum/(previousDates.length + currentDates.length)*100);
  
    // Find beginning and end dates of the week
    if (isPrevious) {
      start = previousDates[dateNumber][0];
      end = previousDates[dateNumber][1];
    } else {
      start = currentDates[dateNumber][0];
      end = currentDates[dateNumber][1];
    }
  
    // Get list of songs for the provided week
    http.get('https://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user='+ username +
    '&from=' + start + '&to=' + end + '&api_key=' + process.env.LASTFM_API_KEY + '&format=json', (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        // Get list of songs in the week
        let chart = JSON.parse(data).weeklytrackchart;
        if (chart != undefined) { // If songs were listened to during this week
          // Add each song to the big array of all the songs 
          for (let i = 0; i < chart.track.length; i++) {
            let song = chart.track[i];
            song["previousTotal"] = 0;
            song["currentTotal"] = 0;
            addSong(song, isPrevious);
          }
        }
      
        // Determine whether to go to the next week, or whether this is the last week of the section
        let datesToCompare;
        if (isPrevious) {
          datesToCompare = previousDates;
        } else {
          datesToCompare = currentDates;
        }
        if (dateNumber + 1 === datesToCompare.length) {
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
    
    getDates(startDate, endDate, function(calculatedPreviousDates) {
      getDates(endDate, new Date(), function(calculatedCurrentDates) {
        previousDates = calculatedPreviousDates;
        currentDates = calculatedCurrentDates;
        if (previousDates.length > 0) { // If there is at least one week in the "previous" section
          getSongs(0, true, function() { // Get songs contained in the "previous" section
            if (currentDates.length > 0) { // If there is at least one week in the "current" section
              getSongs(0, false, function() { // Get songs contained in the "current" section
                outputResults();
              })
            } else {
              outputResults();
            }
          });
        } else {
          // If there are no weeks contained in the previousDates array, there is no valid information,
          // so there is no need to calculate songs in the "current" section
          outputResults(); 
        }
      });
    });
  }
  
  // Output results once the calculations are complete
  function outputResults() {
  
    // Determine which songs pass the requirements and count towards the results
    for (let i = 0; i < songs.length; i++) {
      if ( (songs[i].previousTotal >= previousLimit) && (songs[i].currentTotal <= currentLimit)) {
        songs[i]["artistText"] = songs[i].artist['#text'];
        results.push(songs[i]);
      }
    }
    // Sort results by the total number of listens during the "previous" section
    results.sort((a,b) => {return b.previousTotal - a.previousTotal});

    let resultTextArray = [];
    for (let i = 0; i < results.length; i++) {
      resultTextArray[i] = new Array(results[i].name, results[i].artist['#text'], results[i].previousTotal, results[i].currentTotal);
    }
    setResultText(resultTextArray);
    setProgress(100); // Calculations are finished now
  
    // Reset variables and prepare to the run the program again
    songs = [];
    results = [];
    previousDates = [];
    currentDates = [];
  }

  // This hook calls the function to run the main program, and is triggered whenever runAgain is incremented
  React.useEffect(() => {
    // Reset variables to the correct starting values
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
    <div>
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
