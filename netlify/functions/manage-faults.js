const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
    const adminPassword = event.headers['x-admin-password'];
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
    }

    const { action, data } = JSON.parse(event.body);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        switch (action) {
            case 'addFault':
                await addFault(supabase, data);
                break;
            case 'updateFault':
                await updateFault(supabase, data);
                break;
            case 'deleteFault':
                await deleteFault(supabase, data);
                break;
            case 'addMaterial':
                await addMaterial(supabase, data);
                break;
            case 'updateMaterial':
                await updateMaterial(supabase, data);
                break;
            case 'deleteMaterial':
                await deleteMaterial(supabase, data);
                break;
            case 'importModelData':
                await importModelData(supabase, data, true);
                break;
            case 'importModelDataIncremental':
                await importModelData(supabase, data, false);
                break;
            default:
                throw new Error('Unknown action');
        }
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
};

// 辅助函数
async function getModelId(supabase, modelCode) {
    const { data: model, error } = await supabase.from('models').select('id').eq('code', modelCode).single();
    if (error) throw new Error('Model not found');
    return model.id;
}

async function addFault(supabase, { modelCode, code, materials }) {
    const modelId = await getModelId(supabase, modelCode);
    const { data: fault, error } = await supabase.from('faults').insert({ model_id: modelId, code }).select().single();
    if (error) throw error;
    if (materials && materials.length) {
        const mats = materials.map(m => ({ ...m, fault_id: fault.id }));
        const { error: matError } = await supabase.from('materials').insert(mats);
        if (matError) throw matError;
    }
}

async function updateFault(supabase, { faultId, code }) {
    const { error } = await supabase.from('faults').update({ code }).eq('id', faultId);
    if (error) throw error;
}

async function deleteFault(supabase, { faultId }) {
    const { error } = await supabase.from('materials').delete().eq('fault_id', faultId);
    if (error) throw error;
    const { error: faultError } = await supabase.from('faults').delete().eq('id', faultId);
    if (faultError) throw faultError;
}

async function addMaterial(supabase, { faultId, seq, name, code, location, usage_rate }) {
    const { error } = await supabase.from('materials').insert({ fault_id: faultId, seq, name, code, location, usage_rate });
    if (error) throw error;
}

async function updateMaterial(supabase, { materialId, seq, name, code, location, usage_rate }) {
    const { error } = await supabase.from('materials').update({ seq, name, code, location, usage_rate }).eq('id', materialId);
    if (error) throw error;
}

async function deleteMaterial(supabase, { materialId }) {
    const { error } = await supabase.from('materials').delete().eq('id', materialId);
    if (error) throw error;
}

async function importModelData(supabase, { modelCode, faults }, replace) {
    const modelId = await getModelId(supabase, modelCode);
    if (replace) {
        // 删除原有数据
        const { data: oldFaults } = await supabase.from('faults').select('id').eq('model_id', modelId);
        if (oldFaults && oldFaults.length) {
            const faultIds = oldFaults.map(f => f.id);
            await supabase.from('materials').delete().in('fault_id', faultIds);
            await supabase.from('faults').delete().in('id', faultIds);
        }
    }
    // 插入新数据
    for (const fault of faults) {
        const { data: newFault, error: faultError } = await supabase.from('faults').insert({ model_id: modelId, code: fault.code }).select().single();
        if (faultError) throw faultError;
        if (fault.materials && fault.materials.length) {
            const mats = fault.materials.map(m => ({ ...m, fault_id: newFault.id }));
            const { error: matError } = await supabase.from('materials').insert(mats);
            if (matError) throw matError;
        }
    }
}