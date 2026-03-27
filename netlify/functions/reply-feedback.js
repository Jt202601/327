const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
    const adminPassword = event.headers['x-admin-password'];
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
    }

    const { feedbackId, reply } = JSON.parse(event.body);
    if (!feedbackId || !reply) {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing feedbackId or reply' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase
        .from('feedbacks')
        .update({ reply, reply_time: new Date().toISOString(), status: 'resolved' })
        .eq('id', feedbackId);
    if (error) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
};