import * as React from "react";
import { Card, CardHeader, CardContent, Avatar, Box, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export type Team = {
  id: number;
  name: string;
  /** any valid CSS color (e.g., "#1976d2", "rgb(25,118,210)", "rebeccapurple") */
  color: string;
};

export interface PredictedWinnerCardProps {
  /** All available teams */
  teams: Team[];
  /** The ID of the team to display */
  teamId: Team["id"];
  /** Optional styles */
  sx?: SxProps<Theme>;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Renders a Material UI card highlighting the predicted winner.
 * - Shows a color avatar using the team's color.
 * - Gracefully handles missing teams or empty input.
 */
export default function PredictedWinnerCard({ teams, teamId, sx, className }: PredictedWinnerCardProps) {
  const team = React.useMemo(() => teams.find(t => String(t.id) === String(teamId)), [teams, teamId]);

  const header = (
    <CardHeader
      title={
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.8 }}>
          predicted winner
        </Typography>
      }
      sx={{ pb: 0.5 }}
    />
  );

  if (!teams?.length) {
    return (
      <Card elevation={3} sx={{ p: 1.5, ...sx }} className={className}>
        {header}
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No teams provided.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return (
      <Card elevation={3} sx={{ p: 1.5, ...sx }} className={className}>
        {header}
        <CardContent>
          <Typography variant="body1" fontWeight={600}>
            Unknown team
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No team matches the provided ID: {String(teamId)}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={3}
      sx={{ p: 1.5, borderLeft: `6px solid ${team.color}`, ...sx }}
      className={className}
    >
      {header}
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 1 }}>
        <Avatar sx={{ bgcolor: team.color, width: 36, height: 36 }} aria-label={`${team.name} color`}>
          {team.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            {team.name}
          </Typography>
        </Box>
        
      </CardContent>
    </Card>
  );
}

// --- Example usage ---
// <PredictedWinnerCard
//   teams={[
//     { id: 1, name: "Lions", color: "#1976d2" },
//     { id: 2, name: "Tigers", color: "#e53935" },
//   ]}
//   teamId={2}
// />
