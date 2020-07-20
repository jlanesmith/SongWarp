import 'date-fns';
import React from 'react';
import Results from './results.jsx';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid'
import Alert from '@material-ui/lab/Alert';
import CircularProgress from '@material-ui/core/CircularProgress';
import CheckIcon from '@material-ui/icons/CheckCircleOutlineRounded';
import ExIcon from '@material-ui/icons/HighlightOffRounded';
import DateFnsUtils from '@date-io/date-fns';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';

export default function Home() {

  const [username, setUsername] = React.useState("");
  const [startDate, setStartDate] = React.useState(new Date('2020/05/25'));
  const [endDate, setEndDate] = React.useState(new Date('2020/07/01'));
  const [previousLimit, setPreviousLimit] = React.useState(2);
  const [currentLimit, setCurrentLimit] = React.useState(1);

  const [isGoTime, setIsGoTime] = React.useState(false);
  const [userErrorMessage, setUserErrorMessage] = React.useState("");
  const [checkUserState, setCheckUserState] = React.useState(0);   // 0=nothing, 1==loading, 2=success, 3=error
  const [timeLastUsername, setTimeLastUsername] = React.useState(0); // Time since username was changed last

  const http = require('http');

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - timeLastUsername > 500 && checkUserState == 1) {
        setTimeLastUsername(Date.now())
        setCheckUserState(1);
        checkUser(username);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [username, checkUserState]);

  function checkUser(newUsername) {
    http.get('https://ws.audioscrobbler.com/2.0/?method=user.getInfo&user='+ newUsername +
    '&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        if (resp.statusCode == 200) {
          setCheckUserState(2);
        } else {
          setCheckUserState(3);
        }
      }); 
    }).on("error", (err) => {
      setUserErrorMessage("Error while finding user " + newUsername + ": " + err.message);
    });
  }

  return (
    <div className="container">  
      <main>
        <h1 className="title">
          Welcome to SongBack!
        </h1>
        <p className="description">
          This app finds songs that you listened to at least "x" times during a given time period, 
          but have listened to no more than "y" times since that time period to the present.
        </p>
        <Grid container className="formContainer">
          <Grid item xs={12} className="inputContainer">
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
            {checkUserState === 1 && <CircularProgress className="circularProgress"/>}
            {checkUserState === 2 && <CheckIcon className="checkIcon"/>}
            {checkUserState === 3 && <ExIcon className="closeIcon"/>}
            {userErrorMessage.length > 0 && <Alert className="errorMessage" severity="error">{userErrorMessage}</Alert>}
          </Grid>
          <Grid item xs={12} md={6} className="inputContainer">
            <p>Enter a start date for the time period</p>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardDatePicker
                variant="inline"
                format="yyyy/MM/dd"
                margin="normal"
                label="Start Date"
                value={startDate}
                onChange={(newDate) => setStartDate(newDate)}
              />
            </MuiPickersUtilsProvider>
          </Grid>
          <Grid item xs={12} md={6} className="inputContainer">
            <p>Enter an end date for the time period</p>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardDatePicker
                variant="inline"
                format="yyyy/MM/dd"
                margin="normal"
                label="End Date"
                value={endDate}
                onChange={(newDate) => setEndDate(newDate)}
              />
            </MuiPickersUtilsProvider>
          </Grid>
          <Grid item xs={12} className="inputContainer">
            <p>Enter a previous limit (The minimum for how many times you listened to this song during the time period)</p>
            <TextField 
              value={previousLimit} 
              onChange={(event) => {setPreviousLimit(event.target.value)}} 
              className="input" 
              label="Previous limit" 
              variant="outlined"
              type="number"
            />
          </Grid>
          <Grid item xs={12} className="inputContainer">
            <p>Enter a current limit (The maximum for how many times you listened to this song since the time period)</p>          
            <TextField 
              value={currentLimit} 
              onChange={(event) => {setCurrentLimit(event.target.value)}} 
              className="input" 
              label="Current limit" 
              variant="outlined"
              type="number"
            />
          </Grid>
        </Grid>
        <Button className="button" onClick={() => setIsGoTime(true)} variant="contained" color="primary" size="large">
          <p className="buttonText">Get songs</p>
        </Button>
        {isGoTime &&
          <Results 
            username={username} 
            startDateText={startDate} 
            endDateText={endDate} 
            previousLimit={previousLimit} 
            currentLimit={currentLimit}
          />
        }
      </main>
      <footer>
         Made by Jonathan Lane-Smith
      </footer>
    </div>
  )
}
