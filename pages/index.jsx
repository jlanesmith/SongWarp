/*
  This file contains the React code for the main webpage of SongWarp
*/

import 'date-fns';
import React from 'react';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Alert from '@material-ui/lab/Alert';
import CircularProgress from '@material-ui/core/CircularProgress';
import CheckIcon from '@material-ui/icons/CheckCircleOutlineRounded';
import ExIcon from '@material-ui/icons/HighlightOffRounded';
import RediscoverSongs from './rediscoverSongs.jsx';
import BarChartRace from './barChartRace.jsx';


export default function Index() {

  const [username, setUsername] = React.useState("");
  const [tabValue, setTabValue] = React.useState(0);
  const [startDate, setStartDate] = React.useState(new Date('2020/06/25'));
  const [endDate, setEndDate] = React.useState(new Date('2020/08/01'));
  const [previousLimit, setPreviousLimit] = React.useState(2);
  const [currentLimit, setCurrentLimit] = React.useState(1);

  const [goTime, setGoTime] = React.useState(0); // Increments by 1 whenever songs are calculated
  const [downloadTime, setDonwloadTime] = React.useState(0); // Increments by 1 whenever CSVs are downloaded
  // Error message if LastFM api fails while searching for user
  const [userErrorMessage, setUserErrorMessage] = React.useState(""); 
  // Eror message if invalid parameters
  const [invalidParametersMessage, setInvalidParametersMessage] = React.useState("") 
  // State of icon beside username text box: 0=nothing, 1==loading, 2=success, 3=error
  const [checkUserState, setCheckUserState] = React.useState(0); 
  const [lastCheckedUsername, setLastCheckedUsername] = React.useState(""); // Last username that was checked
  const [timeLastUsername, setTimeLastUsername] = React.useState(0); // Time since username was changed last

  const http = require('http');

  // This block of code waits until it has been 500ms since the username was changed last and either the icon
  // is loading or the username does not equal the lastCheckedUsername (which would occur if the username was changed
  // right as the username was being checked), and then checks to see whether the username exists in LastFM's database
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - timeLastUsername > 500 && (checkUserState == 1 || lastCheckedUsername !== username)) {
        setTimeLastUsername(Date.now());
        setLastCheckedUsername(username);
        setCheckUserState(1); // Set icon to loading
        checkUser(username);
      }
    }, 150); // Check every 150 ms (which means the user could be checked 650 ms after it was changed last)
    return () => clearInterval(interval);
  }, [username, lastCheckedUsername, checkUserState]);

  // Check to see whether the username exists in LastFM's database
  function checkUser(newUsername) {
    http.get('https://ws.audioscrobbler.com/2.0/?method=user.getInfo&user='+ newUsername +
    '&api_key=' + process.env.LASTFM_API_KEY + '&format=json', (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        if (resp.statusCode == 200) {
          setCheckUserState(2); // Set icon to success
        } else {
          setCheckUserState(3); // Set icon to error
        }
      });
    }).on("error", (err) => {
      // If LastFM api fails while searching for user
      setUserErrorMessage("Error while finding user " + newUsername + ": " + err.message);
    });
  }

  // This increments goTime, which will trigger results.jsx to calculate the list of songs
  const clickGo = () => {
    if (checkUserState === 2 && startDate !== null && endDate !== null && previousLimit !== "" && previousLimit >= 0 
        && currentLimit !== "" &&  currentLimit >= 0) { // If parameters are valid
      setInvalidParametersMessage("");
      setGoTime(goTime + 1);
    } else {
      setInvalidParametersMessage("Invalid or empty parameters");
    }
  }

  return (
    <div className="container">  
      <main>
        <h1 className="title">
          Welcome to SongWarp!
        </h1>
        <p className="description">
          This app consists of two programs which can be used to give you greater insight into your musical taste and 
          how it changes over time! 
        </p>
        <div className="formContainer">
          <div className="inputContainer">
            <p>Enter your Last.fm username</p>
            <TextField 
              value={username} 
              onChange={(event) => {
                setUsername(event.target.value);
                setTimeLastUsername(Date.now())
                setCheckUserState(1);
              }} 
              className="usernameInput"
              label="Username"
              variant="outlined"
            />
            <div className="iconContainer">
              {checkUserState === 1 && <CircularProgress className="circularProgress"/>}
              {checkUserState === 2 && <CheckIcon className="checkIcon"/>}
              {checkUserState === 3 && <ExIcon className="closeIcon"/>}
            </div>
            {userErrorMessage.length > 0 && <Alert className="errorMessage" severity="error">{userErrorMessage}</Alert>}
          </div>
          <AppBar position="static" className="tabs">
            <Tabs
              value={tabValue}
              onChange={(event, newValue) => {setTabValue(newValue)}}
              variant="fullWidth"
              TabIndicatorProps = {{
                style: {
                  visibility: "hidden"
                }
              }}
            >
              <Tab label="Rediscover songs" />
              <Tab label="Bar chart race" />
            </Tabs>
          </AppBar>
          <div hidden={tabValue !== 0}>
            <RediscoverSongs username={username} checkUserState={checkUserState} />
          </div>
          <div hidden={tabValue !== 1}>
            <BarChartRace username={username} checkUserState={checkUserState} />
          </div>
        </div> 
      </main>
      <footer>
         Made by Jonathan Lane-Smith
      </footer>
    </div>
  )
}
