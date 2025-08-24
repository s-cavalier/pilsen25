'use client'
import { Box, Divider } from "@mui/material";
import ActivationCanvas from "./NeuralNet";
import TeamPicker from "./TeamPicker";
import { useState } from "react";
import PredictedWinnerCard from "./Output";


const TEAMS = [
    { name: 'Pacers', color: 'rgba(38, 0, 255, 1)', id: 0 },
    { name: 'OKC', color: 'rgba(255, 0, 0, 1)', id: 1 },
    { name: 'Rebels', color: 'rgba(21, 255, 0, 1)', id: 2 },
    { name: 'UIC', color: 'rgba(238, 255, 0, 1)', id: 3 },
    { name: 'Sun', color: 'rgba(128, 0, 0, 1)', id: 4 },
    { name: 'Sky', color: 'rgba(28, 72, 109, 1)', id: 5 },
    { name: 'Liberty', color: 'rgba(0, 183, 255, 1)', id: 6 },
    { name: 'Illinois', color: 'rgba(255, 255, 255, 1)', id: 7 },
    { name: 'DePaul', color: 'rgba(0, 247, 255, 1)', id: 8 },
    { name: 'Northwestern', color: 'rgb(0, 0, 0)', id: 9 },
    { name: 'Storm', color: 'rgba(223, 223, 223, 1)', id: 10 },
    { name: 'Mercury', color: 'rgba(35, 95, 0, 1)', id: 11 },
    { name: 'Titans', color: 'rgba(129, 52, 52, 1)', id: 12 },
    { name: 'Wings', color: 'rgba(59, 59, 59, 1)', id: 13 },
    { name: 'Knicks', color: 'rgba(40, 45, 110, 1)', id: 14 },
    { name: 'Bucks', color: 'rgba(119, 0, 255, 1)', id: 15 },
]

type Team = {
    name: string;
    color: string;
    id: number;
}

function sigmoid(x: number) {
    return 1 / ( 1 + Math.exp(-x) );
}

export default function Landing() {
    const [id1, setID1] = useState<number>(0);
    const [id2, setID2] = useState<number>(1);
    const [winnerID, setWinnerID] = useState<number>(0);

    return (
        <Box my='40px' >
            <TeamPicker 
            teams={TEAMS} 
            onActivate={ (a, b) => { setID1(a.id); setID2(b.id); } } 
            labels={{
                activate: 'select'
            }}
        />

            <Divider sx={{ my: 5 }} />

            <ActivationCanvas layers={[1, 6, 3, 5, 2]} inputVector={[id1, id2]} onResult={ (vec) => {
                const left = sigmoid(vec[0]);
                const right = sigmoid(vec[1]);
                
                if (left > right) {
                    setWinnerID(id1);
                } else {
                    setWinnerID(id2);
                }


            } } />

            <PredictedWinnerCard teams={TEAMS} teamId={winnerID} sx={{ width: '50%', justifySelf: 'center', my: 5 }} />
        
        </Box>
    );
}