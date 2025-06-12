import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./code/language";
import Withoutsignin from "./code/chatwithoutsign";
import SignIn from "./code/SignIn";
import SignUp from "./code/SignUp";
import ChildInfo from "./code/childinfo"
import ChatBot from "./code/ChatBot";
import NewChildInfo from "./code/NewChildInfo";
import EditChild from "./code/EditChild";
import MilestoneAssessment from "./code/MilestoneAssesment";
import ChildAssessment from "./code/ChildAssesment";
import BMICheck from "./code/BMICheck2";
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route exact path="/" element={<Index />} />
          <Route path="/startchatwithoutsign" element={<Withoutsignin />} />
          <Route exact path="/signin" element={<SignIn />} />
          <Route exact path="/signup" element={<SignUp />} />
          <Route path="/child-info" element={<ChildInfo />} />
          <Route path="/new-child" element={<NewChildInfo />} />
          <Route path="/chatbot" element={<ChatBot />} />
          <Route path="/edit-child/:childId" element={<EditChild />}/>
          <Route path="/milestone" element={<MilestoneAssessment />}/>
          <Route path="/bmicheck" element={<BMICheck/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
