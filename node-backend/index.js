import express from 'express';
const app = express();
app.get('/api/sla', (req, res) => {
  res.json([{ service: "Test", sla: 0.99 }]);
});
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});