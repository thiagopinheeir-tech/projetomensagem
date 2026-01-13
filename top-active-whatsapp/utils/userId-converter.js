/**
 * Helper para converter userId para o tipo correto baseado no tipo da coluna user_id na tabela
 * Resolve incompatibilidade entre INTEGER (PostgreSQL local) e UUID (Supabase)
 */

const { query } = require('../config/database');

// Cache de tipos de coluna por tabela
const columnTypeCache = new Map();

/**
 * Detecta o tipo de dados da coluna user_id em uma tabela
 * @param {string} tableName - Nome da tabela
 * @returns {Promise<'integer'|'uuid'|null>}
 */
async function detectUserIdType(tableName) {
  // Verificar cache primeiro
  if (columnTypeCache.has(tableName)) {
    return columnTypeCache.get(tableName);
  }

  try {
    const result = await query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = 'user_id'
      LIMIT 1
    `, [tableName]);

    if (result.rows.length === 0) {
      // Se não tem coluna user_id, verificar tipo de users.id
      const usersResult = await query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
        LIMIT 1
      `);
      
      const usersIdType = usersResult.rows[0]?.data_type;
      columnTypeCache.set(tableName, usersIdType === 'uuid' ? 'uuid' : 'integer');
      return columnTypeCache.get(tableName);
    }

    const dataType = result.rows[0].data_type;
    const type = dataType === 'uuid' ? 'uuid' : 'integer';
    columnTypeCache.set(tableName, type);
    return type;
  } catch (error) {
    console.error(`❌ Erro ao detectar tipo de user_id em ${tableName}:`, error);
    // Fallback: assumir INTEGER (PostgreSQL local padrão)
    columnTypeCache.set(tableName, 'integer');
    return 'integer';
  }
}

/**
 * Converte userId para o tipo correto baseado no tipo da coluna user_id na tabela
 * @param {string} tableName - Nome da tabela
 * @param {number|string|UUID} userId - ID do usuário (pode ser INTEGER ou UUID)
 * @returns {Promise<number|string>} - userId convertido para o tipo correto
 */
async function convertUserIdForTable(tableName, userId) {
  if (!userId) {
    return userId;
  }

  // Normalizar userId: converter string numérica para número
  let normalizedUserId = userId;
  if (typeof userId === 'string' && /^\d+$/.test(userId)) {
    normalizedUserId = parseInt(userId, 10);
  }

  const columnType = await detectUserIdType(tableName);
  console.log(`🔍 [convertUserIdForTable] Tabela: ${tableName}, userId: ${userId} (${typeof userId}), tipo coluna: ${columnType}`);
  
  // Se a coluna é UUID mas userId é INTEGER, precisamos buscar o UUID do usuário
  if (columnType === 'uuid' && typeof normalizedUserId === 'number') {
    try {
      const result = await query(`
        SELECT uuid FROM users WHERE id = $1 LIMIT 1
      `, [normalizedUserId]);
      
      if (result.rows.length > 0) {
        const uuid = result.rows[0].uuid;
        console.log(`✅ [convertUserIdForTable] Convertido ${normalizedUserId} -> ${uuid}`);
        return uuid;
      } else {
        console.warn(`⚠️ [convertUserIdForTable] Usuário ${normalizedUserId} não encontrado na tabela users`);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar UUID do usuário ${normalizedUserId}:`, error.message);
      throw error;
    }
  }
  
  // Se a coluna é INTEGER mas userId é UUID, precisamos buscar o INTEGER do usuário
  if (columnType === 'integer' && typeof userId === 'string' && userId.includes('-')) {
    try {
      const result = await query(`
        SELECT id FROM users WHERE uuid = $1 LIMIT 1
      `, [userId]);
      
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar INTEGER do usuário ${userId}:`, error);
    }
  }

  // Se já está no tipo correto, retornar como está
  return userId;
}

/**
 * Limpa o cache de tipos (útil para testes ou após migrações)
 */
function clearCache() {
  columnTypeCache.clear();
}

module.exports = {
  detectUserIdType,
  convertUserIdForTable,
  clearCache
};
