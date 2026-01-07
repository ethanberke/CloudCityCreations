import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import CardMedia from '@mui/material/CardMedia';
import CardActionArea from '@mui/material/CardActionArea';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));


export default function RecipeTile({ }) {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2}>
        <Grid size={3}>
            <Card>
            <CardActionArea>
                <CardMedia
                component="img"
                height="150"
                src="../images/grogu_peak.jpg"
                alt="App Icon"
                />
                <CardContent sx={{ height: 50}}>
                    <Typography variant="h5" component="div" sx={{alignItems: 'center', justifyContent: 'center', display: 'flex'}}>
                        Recipe Name
                    </Typography>
                </CardContent>
            </CardActionArea>
            </Card>

        </Grid>

        <Grid size={3}>
            <Card>
            <CardActionArea>
                <CardMedia
                component="img"
                height="150"
                src="../images/grogu_peak.jpg"
                alt="App Icon"
                />
                <CardContent sx={{ height: 50}}>
                    <Typography variant="h5" component="div" sx={{alignItems: 'center'}}>
                        Recipe Name
                    </Typography>
                </CardContent>
            </CardActionArea>
            </Card>

        </Grid>

        <Grid size={3}>
            <Card>
            <CardActionArea>
                <CardMedia
                component="img"
                height="150"
                src="../images/grogu_peak.jpg"
                alt="App Icon"
                />
                <CardContent sx={{ height: 50}}>
                    <Typography variant="h5" component="div" sx={{alignItems: 'center', justifyContent: 'center', display: 'flex'}}>
                        Recipe Name
                    </Typography>
                </CardContent>
            </CardActionArea>
            </Card>

        </Grid>
      </Grid>
    </Box>
  );
}