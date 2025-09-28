import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          message: 'Please upload a PNG, JPEG, GIF, or WebP image'
        },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You are a precise TradingView chart analyzer. Your task is to extract EXACT values from the chart image. Never return placeholder text or instructions. If a value is not visible or cannot be determined, return an empty string or 0."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract these EXACT values from the TradingView chart. For each field, I'll tell you exactly where to look:\n\n" +
                "SYMBOL:\n" +
                "- Look at the very top-left corner of the chart\n" +
                "- It's usually in large text, like 'EURUSD' or 'ES1!'\n" +
                "- If not found, return empty string\n\n" +
                "TIMEFRAME:\n" +
                "- Look at the top of the chart for buttons like '1m', '5m', '15m'\n" +
                "- The active timeframe button is highlighted\n" +
                "- Return exact text shown (e.g., '5m', '1h')\n\n" +
                "DATE & TIME:\n" +
                "- Look at the bottom horizontal time scale (e.g. 14:40, 14:50, 15:00, 15:10, 15:20, 15:30, etc.)\n" +
                "- Find the time marker that corresponds to when the trade was executed (usually where the entry arrow/line is)\n" +
                "- Use the EXACT time shown on the chart scale, not any other time references\n" +
                "- IGNORE any timestamps in labels, tooltips, or other text - ONLY use the bottom time scale\n" +
                "- For date, use the file name or chart title if visible, otherwise use current date\n" +
                "- Format date as YYYY-MM-DD\n" +
                "- Format time as HH:MM (24-hour format, no timezone needed)\n" +
                "- Example: If chart shows 15:30 on the time scale, use '15:30'\n\n" +
                "PRICE LEVELS (CRITICAL - Follow these steps exactly):\n" +
                "1. Find Entry Price:\n" +
                "   - Look at the price scale on the right (grey box with white numbers)\n" +
                "   - Find the price level where the GREEN candle starts\n" +
                "2. Find Stop and Target Sizes:\n" +
                "   - Look for text 'Stop: 39.25 (0.16%)'\n" +
                "   - Look for text 'Target: 78.25 (0.32%)'\n" +
                "   - Extract the FIRST number (39.25 and 78.25)\n\n" +
                "3. Calculate Final Prices:\n" +
                "   - For SHORT trades:\n" +
                "     * Stop Loss = Entry + Stop Size\n" +
                "     * Take Profit = Entry - Target Size\n" +
                "   - For LONG trades:\n" +
                "     * Stop Loss = Entry - Stop Size\n" +
                "     * Take Profit = Entry + Target Size\n\n" +
                "4. Verify Risk/Reward:\n" +
                "   - Look for text 'Risk Reward Ratio: X.XX'\n" +
                "   - Use this exact value\n\n" +
                "5. MAX R:R ANALYSIS (CRITICAL):\n" +
                "   - Look for the ENTIRE price movement on the chart, not just the initial target box\n" +
                "   - Find the FARTHEST point price moved in the PROFIT direction\n" +
                "   - This often extends well beyond the initial green target box\n" +
                "   - Use the price scale on the right to get exact price levels\n" +
                "   - Calculate: (Max Price - Entry Price) / (Entry Price - Stop Loss Price) for LONG\n" +
                "   - Calculate: (Entry Price - Min Price) / (Stop Loss Price - Entry Price) for SHORT\n" +
                "   - Look for the absolute lowest/highest price on the entire chart in profit direction\n" +
                "   - This gives you the TRUE maximum R:R the trade could have achieved\n\n" +
                "6. MAX ADVERSE ANALYSIS (CRITICAL - AFTER 1R BREAKEVEN):\n" +
                "   - This measures how much the trade ran AFTER reaching 1R (breakeven point)\n" +
                "   - Find where price first reached 1R profit (breakeven point)\n" +
                "   - Then find the furthest point price moved AGAINST you from that 1R point\n" +
                "   - For LONG: 1R point = Entry + (Entry - Stop Loss), then find lowest point after that\n" +
                "   - For SHORT: 1R point = Entry - (Stop Loss - Entry), then find highest point after that\n" +
                "   - Calculate: (1R Point - Worst Point After 1R) / (Entry - Stop Loss) for LONG\n" +
                "   - Calculate: (Worst Point After 1R - 1R Point) / (Stop Loss - Entry) for SHORT\n" +
                "   - Express as 'X.XR' (e.g., '2.5R' means 2.5 times the risk after breakeven)\n" +
                "   - This shows how much additional profit was given back after reaching breakeven\n\n" +
                "IMPORTANT: List ALL price levels you see on the right scale!\n\n" +
                "TRADE DIRECTION:\n" +
                "- If Entry > Stop Loss = SHORT\n" +
                "- If Entry < Stop Loss = LONG\n" +
                "- If unclear, return empty string\n\n" +
                "INDICATORS:\n" +
                "- Look at the legend box (usually top-right)\n" +
                "- List each indicator on a new line with a bullet point\n" +
                "- Format exactly like this:\n" +
                "  • Trading Sessions\n" +
                "  • MA Ribbon\n" +
                "  • VWAP\n" +
                "- If none visible, return empty string\n\n" +
                "VISUAL ANALYSIS FOR MAX R:R AND MAX ADVERSE:\n" +
                "- Look at the ENTIRE chart movement, not just the initial target/stop boxes\n" +
                "- Price often continues much further than the initial target\n" +
                "- For MAX R:R: Find the absolute lowest/highest price on the entire chart in profit direction\n" +
                "- For MAX ADVERSE: Find how much profit was given back AFTER reaching 1R (breakeven)\n" +
                "- Use the price scale on the right to get exact price levels\n" +
                "- Calculate ratios based on the risk amount (Entry - Stop Loss)\n" +
                "- Example: Entry 24542.50, stop 24581.75 (39.25 risk), 1R point = 24503.25, if price went to 24420 then back to 24503.25, MaxAdverse = (24503.25 - 24420) / 39.25 = 2.12R\n" +
                "- This shows how much additional profit was given back after breakeven\n\n" +
                "SETUP & CONTEXT:\n" +
                "- Look at price action around entry\n" +
                "- Identify if breaking resistance/support\n" +
                "- Note if trending up/down or ranging\n\n" +
                "RESPOND EXACTLY LIKE THESE EXAMPLES:\n\n" +
                "Example 1 (Using price scale on right side):\n" +
                "Symbol: NASDAQ 100 E-mini Futures\n" +
                "Timeframe: 1m\n" +
                "Date: 2025-09-25\n" +
                "Time: 15:30\n" +
                "Direction: Short\n" +
                "Entry: 24542.50\n" +
                "StopLoss: 24581.75\n" +
                "SLSize: 39.25\n" +
                "TakeProfit: 24464.25\n" +
                "Status: Closed\n" +
                "RR_Achieved: 1.99\n" +
                "MaxRR: 3.12\n" +
                "MaxAdverse: 2.1R\n" +
                "Indicators:\n" +
                "  • Trading Sessions\n" +
                "  • FVG/FVG\n" +
                "  • MA Ribbon\n" +
                "  • Momentum Strategy\n" +
                "  • VWAP\n" +
                "Setup: Momentum breakout\n" +
                "Context: Downtrend\n\n" +
                "Example 2 (When some values are not visible):\n" +
                "Symbol: EURUSD\n" +
                "Timeframe: 1h\n" +
                "Date: \n" +
                "Time: \n" +
                "Direction: Short\n" +
                "Entry: 1.0750\n" +
                "StopLoss: 1.0775\n" +
                "SLSize: 25\n" +
                "TakeProfit: 1.0700\n" +
                "Status: Closed\n" +
                "RR_Achieved: 2\n" +
                "MaxRR: 2.8\n" +
                "MaxAdverse: 1.5R\n" +
                "Indicators: \n" +
                "Setup: Double top\n" +
                "Context: Range\n\n" +
                "Example 3 (When minimal values are visible):\n" +
                "Symbol: \n" +
                "Timeframe: \n" +
                "Date: \n" +
                "Time: \n" +
                "Direction: \n" +
                "Entry: 0\n" +
                "StopLoss: 0\n" +
                "SLSize: 0\n" +
                "TakeProfit: 0\n" +
                "Status: \n" +
                "RR_Achieved: 0\n" +
                "MaxRR: 0\n" +
                "MaxAdverse: \n" +
                "Indicators: \n" +
                "Setup: \n" +
                "Context: "
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ]
    });

    // Parse the response to extract values
    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error('No analysis content received from OpenAI');
    }
    
    // Helper function to extract numeric values from the formatted response
    const extractPrices = (text: string) => {
      // Extract values using the exact format we specified
      const entry = parseFloat(text.match(/Entry:\s*([\d.]+)/)?.[1] || '0');
      const stopLoss = parseFloat(text.match(/StopLoss:\s*([\d.]+)/)?.[1] || '0');
      const takeProfit = parseFloat(text.match(/TakeProfit:\s*([\d.]+)/)?.[1] || '0');
      const slSize = parseFloat(text.match(/SLSize:\s*([\d.]+)/)?.[1] || '0');
      const rrAchieved = parseFloat(text.match(/RR_Achieved:\s*([\d.]+)/)?.[1] || '0');
      const maxRR = parseFloat(text.match(/MaxRR:\s*([\d.]+)/)?.[1] || rrAchieved.toString());
      
      // Extract max adverse (handle both "0.5R" and "0.5" formats)
      const maxAdverseMatch = text.match(/MaxAdverse:\s*([\d.]+)R?/);
      const maxAdverse = maxAdverseMatch ? maxAdverseMatch[1] + 'R' : 'Could not analyze';

      // Return values even if some are 0 or missing - let the UI handle it
      return {
        entry: entry || 0,
        stopLoss: stopLoss || 0,
        takeProfit: takeProfit || 0,
        slSize: slSize || 0,
        rrAchieved: rrAchieved || 0,
        maxRR: maxRR || 0,
        maxAdverse: maxAdverse || 'Could not analyze'
      };
    };

    // Helper function to extract text until newline
    const extractText = (text: string, pattern: string) => {
      const match = text.match(new RegExp(pattern + ':\\s*([^\\n]+)'));
      return match ? match[1].trim() : '';
    };

    // Extract prices from text labels
    const prices = extractPrices(analysis);

    // Extract all values from the AI response
    const symbol = extractText(analysis, 'Symbol');
    const timeframe = extractText(analysis, 'Timeframe');
    const date = extractText(analysis, 'Date');
    const time = extractText(analysis, 'Time');
    const direction = extractText(analysis, 'Direction');
    const status = extractText(analysis, 'Status');
    const setup = extractText(analysis, 'Setup');
    const context = extractText(analysis, 'Context');
    
    // Extract indicators from bullet points
    const indicators = analysis.split('\n')
      .filter(line => line.trim().startsWith('  •'))
      .map(line => line.replace('  •', '').trim());

    const extractedData = {
      symbol: symbol || 'Could not analyze',
      timeframe: timeframe || 'Could not analyze',
      date: date || new Date().toISOString().split('T')[0], // Default to today if not found
      time: time || new Date().toTimeString().slice(0, 5), // Default to current time if not found
      direction: direction || 'Could not analyze',
      entry: prices.entry || 0,
      stopLoss: prices.stopLoss || 0,
      slSize: prices.slSize || 0,
      takeProfit: prices.takeProfit || 0,
      status: status || 'Could not analyze',
      rrAchieved: prices.rrAchieved || 0,
      maxRR: prices.maxRR || 0,
      maxAdverse: prices.maxAdverse || 'Could not analyze',
      indicators: [], // No tags for AI analysis
      setup: setup || 'Could not analyze',
      context: context || 'Could not analyze',
      pnlAmount: null
    };

    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('Analysis Error:', error);

    return NextResponse.json(
      {
        error: 'Analysis Error',
        message: 'Failed to analyze chart image',
        details: error.message,
        suggestion: 'Please upload a valid chart screenshot from TradingView'
      },
      { status: 500 }
    );
  }
}