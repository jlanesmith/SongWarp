/*
  This file contains the input elements for the Rediscover Songs program
*/

import 'date-fns';
import React from 'react';
import Results from './results.jsx';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid'
import Alert from '@material-ui/lab/Alert';
import DateFnsUtils from '@date-io/date-fns';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';

export default function RediscoverSongs(props) {

  const {
    username,
    checkUserState
  } = props;

  const [startDate, setStartDate] = React.useState(new Date('2020/06/25'));
  const [endDate, setEndDate] = React.useState(new Date('2020/08/01'));
  const [previousLimit, setPreviousLimit] = React.useState(2);
  const [currentLimit, setCurrentLimit] = React.useState(1);
  const [goTime, setGoTime] = React.useState(0); // Increments by 1 whenever songs are calculated
  // Eror message if invalid parameters
  const [invalidParametersMessage, setInvalidParametersMessage] = React.useState("") 


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
    <>
      <p className="programDescription">
        This program finds songs that you listened to at least "x" times during a given time period, 
        but listened to no more than "y" times since that time period to the present.
      </p>
      <Grid container>
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
      </Grid>
      <div className="inputContainer">
        <p>Enter a previous limit (The minimum for how many times you listened to this song during the time period)</p>
        <TextField 
          value={previousLimit} 
          onChange={(event) => {setPreviousLimit(event.target.value)}} 
          className="input" 
          label="Previous limit" 
          variant="outlined"
          type="number"
        />
      </div>
      <div className="inputContainer">
        <p>Enter a current limit (The maximum for how many times you listened to this song since the time period)</p>          
        <TextField 
          value={currentLimit} 
          onChange={(event) => {setCurrentLimit(event.target.value)}} 
          className="input" 
          label="Current limit" 
          variant="outlined"
          type="number"
        />
      </div>
      {invalidParametersMessage.length > 0 && 
        <Alert className="errorMessage" severity="error">{invalidParametersMessage}</Alert>
      }
      <Button className="button" onClick={clickGo} variant="contained" color="primary" size="large">
        <p className="buttonText">Get songs</p>
      </Button>
      {goTime > 0 &&
        <Results 
          username={username} 
          startDateText={startDate} 
          endDateText={endDate} 
          previousLimit={previousLimit} 
          currentLimit={currentLimit}
          runAgain={goTime}
        />
      }
    </>
  )
}
