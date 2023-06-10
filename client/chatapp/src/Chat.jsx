import { useEffect, useState } from 'react';
import Cookies from 'universal-cookie';

var MSG_TEMPLATE = {
    receiver: null,
    body: null
}

export default function Chat() {
    const cookies = new Cookies();
    const [message, setMessage] = useState([]);
    const [receiver, setReceiver] = useState("");
    const [online, setOnline] = useState([]);
    const [authorized, setAuthorized] = useState(true);

    useEffect(() => {
        const socket = new WebSocket("ws://" + window.location.hostname + ":4008");
        var enc = new TextEncoder();

        socket.addEventListener("open", () => {
            socket.send(enc.encode(JSON.stringify({ Authorization: cookies.get("session") })));
        });

        socket.addEventListener("message", (event) => {
            event.data.text().then((resp) => {
                if (resp.split(" ")[0] != "Welcome") {
                    setMessage(message => [...message, JSON.parse(resp)]);
                } else {
                    console.log(resp);
                }
            });
        });
    }, [])

    const addReceiver = () => {
        setReceiver(document.getElementById("receiver").value);
    }

    const sendMessage = () => {
        var msg = MSG_TEMPLATE;
        msg.receiver = receiver;
        msg.body = document.getElementsByName("typed")[0].value;

        document.getElementsByName("typed")[0].value = "";

        fetch("/api/user/send", {
            method: "POST",
            body: JSON.stringify(msg),
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + cookies.get("session")
            }
        })
    }

    return (
        <>
        { authorized ? 
            <div className='flex gap-3 h-96'>
                <div className='flex flex-col gap-3'>
                    <input id='receiver' onChange={addReceiver} className='outline-none focus:shadow-lg rounded-lg px-5 py-3 text-gray-700' placeholder="Select someone to talk" />
                    <div className='flex relative h-fit min-h-full w-full bg-white rounded-lg p-5'>
                        <img className='w-8 h-8 absolute bg-white -left-2 -top-2 rounded-full cursor-pointer' src='/assets/reload-refresh.svg'></img>
                        {
                            online.length == 0 ? <div className='flex flex-col h-full w-full justify-center items-center text-gray-500'><img className='w-27 h-16' src='/assets/doggo.jpg'></img>No one is online</div> : <div>
                                { online.map((user) => <p>{user}</p>) }
                            </div>
                        }
                    </div>
                </div>
                <div className='flex flex-col gap-3'>
                    <div className='flex flex-col rounded-lg w-full h-fit min-h-full p-5 text-gray-600 bg-white gap-2 overflow-scroll overflow-x-hidden'>
                        {
                            message.map((msg) =>
                                <div className={msg.sender != receiver ? 'w-full flex justify-end' : 'w-full p-1 flex justify-start'}>
                                    <p className={msg.sender != receiver ? 'w-fit right-0 border-2 border-slate-300 p-1 px-2 rounded-xl rounded-br-none' : 'w-fit right-0 border-2 border-slate-300 p-1 px-2 rounded-xl rounded-bl-none'} style={{ "maxWidth": "250px" }}>{msg.body}</p>
                                </div>
                            )
                        }
                    </div>
                    <div className='flex gap-3 items-center'>
                        <input name='typed' className='outline-none focus:shadow-lg rounded-lg px-5 py-3 text-md text-gray-700 w-full' placeholder='Type something...' />
                        <img onClick={sendMessage} className='h-11 shadow-lg w-auto bg-white transition rounded-lg hover:shadow-xl cursor-pointer' src='/assets/send.png' />
                    </div>
                </div>
            </div>
            :
            <div className='text-3xl'>PLEASE LOGIN</div>
        }
        </>
    )
}