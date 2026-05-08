import React, { useState } from 'react';

const Calculator = () => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operation, setOperation] = useState('');
  const [result, setResult] = useState(0);

  const handleCalculate = async (event) => {
    event.preventDefault();
    try {
      let url = `http://localhost:3000/api/calculator/`;
      switch (operation) {
        case 'add':
          url += 'add';
          break;
        case 'subtract':
          url += 'subtract';
          break;
        case 'multiply':
          url += 'multiply';
          break;
        case 'divide':
          url += 'divide';
          break;
        default:
          console.error('Invalid operation');
          return;
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num1, num2 }),
      });
      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleCalculate}>
      <input type="number" value={num1} onChange={(event) => setNum1(Number(event.target.value))} />
      <select value={operation} onChange={(event) => setOperation(event.target.value)}>
        <option value="">Select operation</option>
        <option value="add">Add</option>
        <option value="subtract">Subtract</option>
        <option value="multiply">Multiply</option>
        <option value="divide">Divide</option>
      </select>
      <input type="number" value={num2} onChange={(event) => setNum2(Number(event.target.value))} />
      <button type="submit">Calculate</button>
      <p>Result: {result}</p>
    </form>
  );
};

export default Calculator;