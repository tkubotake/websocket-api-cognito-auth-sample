import { Amplify } from "aws-amplify";
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import config from "./config";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator, Button } from "@aws-amplify/ui-react";
// import Echo from "./components/echo";
import Chat from "./components/chat";
import { AppBar, Avatar, Container, Toolbar, Typography } from "@mui/material";
import Echo from "./components/echo";

function App() {
  const amplifyConfig = {
    ...(true || config.userPoolId != null
      ? {
        Auth: {
          Cognito: {
            region: config.awsRegion,
            userPoolId: config.userPoolId,
            userPoolClientId: config.userPoolClientId,
          },
        },
      }
      : {}),
  };
  Amplify.configure(amplifyConfig);

  return (
    <Router>
      <Authenticator signUpAttributes={["email"]} loginMechanisms={["username"]}>
        {({ signOut, user }) => {
          return (
            <>
              <AppBar position="static">
                <Toolbar>
                  <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
                    WebSocket API with Cognito authentication
                  </Typography>
                  <Avatar />
                  <Typography sx={{ paddingX: 2 }}>{user == null ? "" : user.username}</Typography>
                  <Button color="inherit" onClick={signOut}>
                    Sign out
                  </Button>
                </Toolbar>
              </AppBar>
              <main>
                <Container maxWidth="lg" sx={{ m: 2 }}>
                  <Routes>
                    <Route path="/echo" element={<Echo />} />
                    <Route path="/chat/:roomId" element={<Chat />} />
                    <Route path="/" element={<Navigate to="/chat/default" replace />} />
                  </Routes>
                </Container>
              </main>
            </>
          );
        }}
      </Authenticator>
    </Router>
  );
}

export default App;