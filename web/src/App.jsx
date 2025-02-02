import { Container, Stack, Typography } from '@mui/material';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import UserView from './components/UserView'
import OnlineView from './components/OnlineView'
import DataView from './components/DataView';
import Navbar from './components/Navbar';
import {BrowserRouter as Router, Routes, Route } from "react-router-dom"


function App() {
  return (
    <> 
    
    {/* <Stack direction="row" sx={{justifyContent: 'center', alignContent: 'center'}}>
      <Typography variant='h4' style={{marginBottom: "1em"}}>Zeiterfassung&nbsp;</Typography>
      <ViewTimelineIcon/>
      </Stack> */}
    <Router>
    <Navbar/>
      <Container maxWidth="md" style={{ marginTop: '40px' }}>
      <Routes>
        <Route path='/' element={<UserView/>}/>
        <Route path='/online' element={<OnlineView/>}/>
        <Route path='/data' element={<DataView/>}/>
        
      </Routes>
    </Container>
    </Router>
      </>
  );
}

export default App;