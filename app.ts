import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('homepage');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});