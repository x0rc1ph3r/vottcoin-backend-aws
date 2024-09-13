import express from 'express';
const router = express.Router();
import startSale from "../contract/startTokenSale.js";
import buyTokens from "../contract/buyToken.js";
import updatePrice from "../contract/updatePrice.js";
import closeSale from "../contract/closeTokenSale.js";

router.post('/start', async (req, res) => {
    try {
        const { price, tokens } = req.body;
        const data = await startSale(parseFloat(price), parseFloat(tokens));
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/buy', async (req, res) => {
    try {
        const { buyerPubkey, tokens } = req.body;
        const data = await buyTokens(buyerPubkey, parseFloat(tokens));

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/update', async (req, res) => {
    try {
        const { tokenprice } = req.body;
        const data = await updatePrice(parseFloat(tokenprice));

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/close', async (req, res) => {
    try {
        const data = await closeSale();

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;