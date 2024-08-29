import { FC, useEffect, useReducer, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Typography, Button, TextField, Stack } from "@mui/material";
import { SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import config from "../config";

type ChatInput = {
  message: string;
};

const Chat: FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { register, handleSubmit, reset } = useForm<ChatInput>();
  const [status, setStatus] = useState("initializing");
  const [messages, setMessages] = useState<string[]>([]);
  const [client, setClient] = useState<WebSocket | null>(null);
  const [closed, forceClose] = useReducer(() => true, false);

  const initializeClient = async () => {
    if (client) {
      console.warn("Existing WebSocket connection detected.");
      return; // 既存の接続がある場合は新しい接続を作成しない
    }

    try {
      const currentSession = await fetchAuthSession();
      const idToken = currentSession.tokens?.idToken;

      const newClient = new WebSocket(`${config.apiEndpoint}?idToken=${idToken}&roomId=${roomId}`);

      const waitForConnection = (socket: WebSocket) => {
        return new Promise((resolve, reject) => {
          socket.onopen = () => {
            setStatus("connected");
            resolve(socket);
          };

          socket.onerror = (error) => {
            setStatus("error");
            reject(error);
          };

          socket.onclose = (event) => {
            setStatus("closed");
            if (event.code === 403) {
              alert("Access denied to the room.");
            }
            if (!closed) {
              // クライアントが閉じられていない場合は再接続を試みる
              setTimeout(async () => {
                await initializeClient();
              }, 5000); // 5秒後に再接続
            }
          };
        });
      };

      try {
        await waitForConnection(newClient);
        // 接続が確立されたら次の処理を設定する
        newClient.onmessage = (message: any) => {
          const messageData = JSON.parse(message.data);
          console.log("Received message:", messageData);

          if (messageData.action === "gethistory") {
            // 履歴のメッセージを受信した場合
            const historyMessages = messageData.history.map((item: any) => item.message);
            setMessages((prev) => [...historyMessages, ...prev]);
          } else if (messageData.action === "new_message") {
            // 新しいメッセージを受信した場合
            setMessages((prev) => [...prev, messageData.message]);
          }
        };

        setClient(newClient);
        fetchChatHistory(newClient);
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
      }
    } catch (error) {
      console.error("Failed to initialize WebSocket client:", error);
      setStatus("error");
    }
  };

  // チャット履歴を取得する
  const fetchChatHistory = async (socket: WebSocket) => {
    if (socket) {
      alert("Fetching chat history...");
      const messageData = {
        action: "gethistory",
        data: { roomId }
      };
      socket.send(JSON.stringify(messageData));
    } else {
      console.error("WebSocket is not connected");
      setStatus("not connected");
    }
  };

  const sendMessage: SubmitHandler<ChatInput> = async (input) => {
    if (client != null) {
      const messageData = {
        action: "send_message",
        data: { message: input.message }
      };
      client.send(JSON.stringify(messageData));
      reset({ message: "" });
    } else {
      console.error('WebSocket is not connected');
      setStatus("not connected");
    }
  };

  const handleUserKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(sendMessage)();
    }
  };

  useEffect(() => {
    initializeClient();
    return () => {
      if (client) {
        forceClose();
        client.close();
      }
    };
  }, []); // 初回のみ実行

  return (
    <Stack justifyContent="center" alignItems="center" sx={{ m: 2 }}>
      <Typography variant="h4" gutterBottom>
        WebSocket Chat demo
      </Typography>
      <Typography variant="subtitle1" sx={{ color: "#808080" }} gutterBottom>
        Current Room: {roomId}
      </Typography>
      <Typography variant="subtitle1" sx={{ color: "#808080" }} gutterBottom>
        status: {status}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ m: 5 }}>
        <TextField id="message" label="Message" size="small" required {...register("message")} onKeyPress={handleUserKeyPress} sx={{ width: 400 }} />
        <Button variant="contained" color="primary" onClick={handleSubmit(sendMessage)}>
          Send
        </Button>
      </Stack>

      <Typography variant="subtitle1" gutterBottom>
        Messages returned from WebSocket server
      </Typography>

      {messages.map((msg, index) => (
        <Typography key={index} sx={{ color: "#808080" }}>
          {msg}
        </Typography>
      ))}
    </Stack>
  );
};

export default Chat;
