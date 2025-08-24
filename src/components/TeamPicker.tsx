import * as React from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from "@mui/material";

export type Team = {
  name: string;
  color: string;
  id: number;
};

export type TeamPickerProps = {
  teams: Team[];
  onActivate: (teamA: Team, teamB: Team) => void;
  title?: string;
  initialA?: string;
  initialB?: string;
  disabled?: boolean;
  labels?: {
    teamA?: string;
    teamB?: string;
    activate?: string;
    swap?: string;
  };
  className?: string;
  sx?: any;
};

function ColorSwatch({ color }: { color: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        height: 12,
        width: 12,
        borderRadius: "50%",
        border: "1px solid rgba(0,0,0,0.2)",
        backgroundColor: color,
        mr: 1,
        verticalAlign: "middle",
      }}
    />
  );
}

export default function TeamPicker({
  teams,
  onActivate,
  title = "Select Teams",
  initialA,
  initialB,
  disabled,
  labels,
  className,
  sx,
}: TeamPickerProps) {
  const [teamAName, setTeamAName] = React.useState<string | undefined>(initialA);
  const [teamBName, setTeamBName] = React.useState<string | undefined>(initialB);

  React.useEffect(() => {
    if (!teams?.length) return;
    setTeamAName((prev) => prev ?? teams[0]?.name);
    setTeamBName((prev) =>
      prev ?? teams.find((t) => t.name !== (teamAName ?? teams[0]?.name))?.name
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  const teamA = teams.find((t) => t.name === teamAName);
  const teamB = teams.find((t) => t.name === teamBName);

  const bothSelected = Boolean(teamA && teamB);
  const sameTeam = teamA && teamB ? teamA.name === teamB.name : false;
  const canActivate = bothSelected && !sameTeam && !disabled;

  const handleSwap = () => {
    if (disabled) return;
    setTeamAName(teamBName);
    setTeamBName(teamAName);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canActivate && teamA && teamB) onActivate(teamA, teamB);
  };

  return (
    <Card className={className} sx={{ maxWidth: 800, mx: "auto", ...sx }}>
      <CardHeader title={<Typography variant="h6">{title}</Typography>} />
      <CardContent>
        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            display: "grid",
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr auto 1fr" },
              alignItems: "end",
            }}
          >
            <FormControl fullWidth disabled={disabled || !teams.length}>
              <InputLabel id="team-a-label">{labels?.teamA ?? "Team A"}</InputLabel>
              <Select
                labelId="team-a-label"
                value={teamAName ?? ""}
                onChange={(e) => setTeamAName(e.target.value)}
              >
                {teams.map((t) => (
                  <MenuItem key={t.name} value={t.name} disabled={t.name === teamBName}>
                    <ColorSwatch color={t.color} />
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
              {teamA && (
                <FormHelperText>
                  <ColorSwatch color={teamA.color} />
                  {teamA.name}
                </FormHelperText>
              )}
            </FormControl>
            

            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Button
                type="button"
                variant="outlined"
                onClick={handleSwap}
                disabled={disabled || !bothSelected}
              >
                {labels?.swap ?? "Swap"}
              </Button>
            </Box>

            <FormControl fullWidth disabled={disabled || !teams.length}>
              <InputLabel id="team-b-label">{labels?.teamB ?? "Team B"}</InputLabel>
              <Select
                labelId="team-b-label"
                value={teamBName ?? ""}
                onChange={(e) => setTeamBName(e.target.value)}
              >
                {teams.map((t) => (
                  <MenuItem key={t.name} value={t.name} disabled={t.name === teamAName}>
                    <ColorSwatch color={t.color} />
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
              {teamB && (
                <FormHelperText>
                  <ColorSwatch color={teamB.color} />
                  {teamB.name}
                </FormHelperText>
              )}
            </FormControl>
          </Box>

          <Box minHeight={20}>
            {sameTeam && (
              <Typography variant="body2" color="error" role="alert">
                Please pick two different teams.
              </Typography>
            )}
          </Box>
          <Typography>Disclaimer: Picking teams in different age/gender groups may give weird results.</Typography>
          <Typography>The AI model below was trained based on NBA teams, so it was presumed teams are somewhat even.</Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: "flex-end" }}>
        <Button type="submit" onClick={onSubmit} disabled={!canActivate} variant="contained">
          {labels?.activate ?? "Activate"}
        </Button>
      </CardActions>
    </Card>
  );
}
