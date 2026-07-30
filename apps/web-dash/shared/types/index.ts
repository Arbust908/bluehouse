/*

{
  "currency": "blue",
  "side": "sell",
  "items": [
    {
      "id": "invoice-123",
      "date": "2026-07-15",
      "amount": 125000
    },
    {
      "id": "subscription-456",
      "datetime": "2026-07-22T14:32:00-03:00",
      "amount": 39990
    }
  ]
}

reponse
{
  "currency": "blue",
  "side": "sell",
  "items": [
    {
      "id": "invoice-123",
      "date": "2026-07-15",
      "amount": 125000,
      "convertedAmount": 96.15,
      "rate": 1300,
      "rateTimestamp": "2026-07-15T18:05:22-03:00"
    }
  ]
}

{
  "amount": 125000,
  "convertedAmount": 96.15,

  "rate": {
    "type": "blue",
    "side": "sell",
    "value": 1300,
    "observedAt": "2026-07-15T17:32:10-03:00"
  }
}


*/