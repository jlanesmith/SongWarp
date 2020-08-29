/*
	This code does the API calls and calculations and generates the CSV file for the bar chart race
*/

import Button from '@material-ui/core/Button';
import Alert from '@material-ui/lab/Alert';
import LinearProgress from '@material-ui/core/LinearProgress';

const http = require('http');
const dateFormat = require('dateformat');


export default function GenerateCsv(props) {

	const {
    username,
    runAgain,
    variant
  } = props;
  
  const [progress, setProgress] = React.useState(0); // Progress in calculations as a percentage, from 0 to 100
  const [progressMessage, setProgressMessage] = React.useState("Loading...");
  // Error message if there is an invalid date, or an API call error
  const [errorMessage, setErrorMessage] = React.useState(""); 
  // Time when calculations begin, in order to determine estimated time left. 
  const [startTimeState, setStartTimeState] = React.useState(0); 
  const [csvData, setCsvData] = React.useState([[]]);

	let startDateNum = 622; // I found that my earliest dates that mattered started at about 622
  let dates = []; // 2D Array of start and end dates
   // Array of songs. Each song is an object with various members, including an array of the song's total
   // cumulative scrobbles
	let songs = [];            
  // startTimeState as a non-state variable, so that it updates immediately and can be used for calculations
  let startTimeCalculations; 
  // Indicator of which Last.FM API endpoint to call
  let variantString = "track"; // By default, get songs
  if (variant === "Albums") {
      variantString = "album"; // Get albums
  } else if (variant === "Artists") {
      variantString = "artist"; // Get artists
  }
  
	// Takes a song and adds it to the songs array
	function addSong(newSong, dateNumber) {
		for (let i = 0; i < songs.length; i++) {

			// If the song already exists in the array, update the playcount
			if ( (songs[i].name === newSong.name) && (variantString === "artist" || songs[i].artist['#text'] === newSong.artist['#text']) ) {
				songs[i].countArray[dateNumber] = songs[i].countArray[dateNumber-1] + parseInt(newSong.playcount);
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
			errorMessage = "Error: " + err.message;
		});
	}

	// Get songs for a specific week
	// dateNumber represents which week it is, with 0 being the earliest week and each following week being incremented by 1
	function getSongs(dateNumber, callback) {

		let start; // Date of beginning of week
    let end; // Date of end of week

    // Progress for calculations as a percentage, between 0 and 100
    let progressNum = dateNumber; 
    if (progressNum == 0) { // If calculations are just starting now
      startTimeCalculations = Date.now()
      setStartTimeState(startTimeCalculations)
    } else {
      // Calculate estimated time left
      let currentTime = Date.now();
      let timeDiff = currentTime - startTimeCalculations;
      let estimatedTotalTime = timeDiff/progressNum*(dates.length);
      let secondsLeft = parseInt((estimatedTotalTime - timeDiff)/1000);
      if (secondsLeft >= 60) {
        let minutesLeft = parseInt(secondsLeft/60);
        setProgressMessage("Estimated time left: " + minutesLeft + " minute" + (minutesLeft === 1 ? "" : "s"));
      } else {
        setProgressMessage("Estimated time left: " + secondsLeft + " second" + (secondsLeft === 1 ? "" : "s"));
      }
    }
    setProgress(progressNum/(dates.length)*100);

		// Find beginning and end dates of the week
		start = dates[dateNumber][0];
		end = dates[dateNumber][1];

		http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweekly' + variantString + 'chart&user='+ username +
			'&from=' + start + '&to=' + end + '&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
			let data = '';
			resp.on('data', (chunk) => {
				data += chunk;
			});
			resp.on('end', () => {

				// Get list of songs in the week
				let chart = JSON.parse(data)['weekly' + variantString + 'chart'];

        // Add each song to the big array of all the songs 
				if (chart !== undefined) {
					for (let i = 0; i < chart[variantString].length; i++) {
						let song = chart[variantString][i];
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
		  errorMessage = "Error: " + err.message;
		});
	}

	// Generate the CSV file
	function makeCSV() {

    let makeCsvData = [[]]
		// The first row contains each of the dates
		makeCsvData[0][0] = variant;
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
				let date = new Date(dates[i][0]*1000);	
				makeCsvData[0][i+1-dateIndexToIgnore] = dateFormat(date, "mmmm dS yyyy");
			}
		}

		for (let i = 0; i < songs.length; i++) {
			for (let j = 0; j < dateIndexToIgnore; j++) {
				songs[i].countArray.shift(); // Remove data for dates in which data doesn't exist
			}
			makeCsvData[i+1] = songs[i].countArray;
			makeCsvData[i+1].unshift(songs[i].name.replace(/[,#]/g, "")); // The first column contains each of the songs' names
    }
    setCsvData(makeCsvData)
    setProgress(100); // Calculations are finished now
    setProgressMessage("Your CSV is ready to download!")
	}

	// This is the main calculation function and shows the general path that the program goes through
	React.useEffect(() => {	
    getDates( function(){
      getSongs(0, function(){
        makeCSV();
      });
    });
  }, [runAgain]);

  const download = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvData.forEach(function(rowArray) {
      let row = rowArray.join(",");
      csvContent += row + "\r\n";
    });
    // Call the csv download via anchor tag(link) so we can provide a name for the file
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SongWarpData.csv");
    link.innerHTML = "Click Here to download";
    document.body.appendChild(link);

    link.click();
    link.remove(); // Remove the link after the download
  }

	return (
    <div>   
      {errorMessage.length > 0 ? (
        <Alert className="errorMessage" severity="error">{errorMessage}</Alert>
      ) : (
        <>
          <p className="progressMessage">{progressMessage}</p>
          {startTimeState > 0 &&
            <LinearProgress className="linearProgress" variant="determinate"  value={progress} />
          }
           {progress === 100 &&
             <Button className="button" onClick={download} variant="contained" color="primary" size="medium">
              <p className="buttonText">Download CSV</p>
            </Button>
          }
        </>
      )}  
    </div>
	)
}
