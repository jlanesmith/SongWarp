/*
	This code makes a bar chart race showing your top songs over time. This was done using the guide found
	in https://towardsdatascience.com/step-by-step-tutorial-create-a-bar-chart-race-animation-da7d5fcd7079
*/

import Button from '@material-ui/core/Button';
import Alert from '@material-ui/lab/Alert';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import GenerateCsv from './generateCsv.jsx';

export default function BarChartRace(props) {

	const {
    username,
    checkUserState
  } = props;
  
  const [goTime, setGoTime] = React.useState(0); // Increments by 1 whenever button is clicked
  const [invalidParameter, setInvalidParameter] = React.useState(false); // whether the parameter (username) is invalid
  const [variant, setVariant] = React.useState("Songs");

  // This increments goTime, which will trigger generateCsv.jsx to create the csv file
  const clickGo = () => {
    if (checkUserState === 2) {
      setInvalidParameter(false);
      setGoTime(goTime + 1);
    } else {
      setInvalidParameter(true);
    }
  }

	return (
    <div>
      <p className="programDescription">
        This program generates a CSV file which, along with <a target="_blank" href="https://app.flourish.studio/register">Flourish</a>, can generate
        a bar chart race to show your top songs/albums/artists over time.
      </p>
      <div>
        <FormControl variant="outlined" className="selectContainer">
          <InputLabel>Variant</InputLabel>
          <Select
            label="Variant"
            value={variant}
            onChange={event => setVariant(event.target.value)}
          >
            <MenuItem value={"Songs"}>Songs</MenuItem>
            <MenuItem value={"Albums"}>Albums</MenuItem>
            <MenuItem value={"Artists"}>Artists</MenuItem>
          </Select>
        </FormControl>
      </div>
      {invalidParameter && 
        <Alert className="errorMessage" severity="error">Invalid username</Alert>
      }
      <Button className="button" onClick={clickGo} variant="contained" color="primary" size="large">
        <p className="buttonText">Generate CSV</p>
      </Button>
      {goTime > 0 &&
        <GenerateCsv
          username={username}
          runAgain={goTime}
          variant={variant}
        />
      }
    </div>
	)
}
