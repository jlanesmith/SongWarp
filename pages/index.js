import 'date-fns';
import React from 'react';
import Results from './results.jsx';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid'
import DateFnsUtils from '@date-io/date-fns';
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from '@material-ui/pickers';

export default function Home() {

  const [isGoTime, setIsGoTime] = React.useState(false);

  const [username, setUsername] = React.useState("jlanesmith");
  const [startDate, setStartDate] = React.useState(new Date('2020/05/25'));
  const [endDate, setEndDate] = React.useState(new Date('2020/07/01'));
  const [previousLimit, setPreviousLimit] = React.useState(2);
  const [currentLimit, setCurrentLimit] = React.useState(1);

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
              onChange={(event) => {setUsername(event.target.value)}} 
              className="input"
              label="Username"
              variant="outlined"
            />
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
