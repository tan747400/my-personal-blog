export default function handler(req, res) {
    if (req.method === "GET") {
      return res.status(200).json({
        data: {
          name: "john",
          age: 20,
        },
      });
    }
  
    return res.status(405).json({ error: "Method not allowed" });
  }