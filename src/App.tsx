function App() {
  const cards = [
    { title: "Athletes", value: "15", subtitle: "Active athletes" },
    { title: "Today's Sessions", value: "8", subtitle: "Scheduled workouts" },
    { title: "Check-ins", value: "6", subtitle: "Submitted today" },
    { title: "Alerts", value: "2", subtitle: "Require attention" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "5px" }}>NoLimit Training</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        High Performance Coaching Dashboard
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h3>{card.title}</h3>
            <h1>{card.value}</h1>
            <p style={{ color: "#666" }}>{card.subtitle}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "30px",
          background: "white",
          borderRadius: "16px",
          padding: "25px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h2>Today's Workout</h2>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "15px",
            marginTop: "15px",
          }}
        >
          <h3>Finger Strength Session</h3>

          <ul>
            <li>Max Hangs - 5 x 10s</li>
            <li>Weighted Pull-Ups - 4 x 5</li>
            <li>Scap Pull-Ups - 3 x 12</li>
            <li>Core Circuit - 3 rounds</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;