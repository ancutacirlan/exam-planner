import React, { useState, useEffect } from "react";

const PeriodForm = ({ periodData = { name: "Examen", period_start: "", period_end: "" }, onSubmit }) => {
  const [formData, setFormData] = useState(periodData);

  // Actualizare a formData la schimbarea periodData (pentru editare)
  useEffect(() => {
    setFormData(periodData);
  }, [periodData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);  // Trimite datele formularului
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Nume:</label>
        <select
          name="name"
          value={formData.name}
          onChange={handleChange}
        >
          <option value="EXAMEN">Examen</option>
          <option value="COLOCVIU">Colocviu</option>
        </select>
      </div>
      <div>
        <label>Data Început:</label>
        <input
          type="date"
          name="period_start"
          value={formData.period_start}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Data Sfârșit:</label>
        <input
          type="date"
          name="period_end"
          value={formData.period_end}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit">
        {periodData.examination_period_id ? "Salvează Modificările" : "Adaugă Perioadă"}
      </button>
    </form>
  );
};

export default PeriodForm;
