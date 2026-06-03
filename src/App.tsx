function App() {
  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "1200px",
        margin: "0 auto"
      }}
    >
      <h1>NoLimit Training</h1>

      <h2>Coach Dashboard</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginTop: "20px"
        }}
      >
        <div
          style={{
            border: "1px solid #ddd",
            padding: "20px",
            borderRadius: "10px"
          }}
        >
          <h3>Today's Workout</h3>
          <p>No workout assigned</p>
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            padding: "20px",
            borderRadius: "10px"
          }}
        >
          <h3>Readiness</h3>
          <p>Not connected yet</p>
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            padding: "20px",
            borderRadius: "10px"
          }}
        >
          <h3>Check-ins</h3>
          <p>No submissions yet</p>
        </div>
      </div>
    </div>
  );
}

export default App;