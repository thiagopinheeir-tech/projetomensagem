/**
 * Middleware de isolamento de dados para multi-tenant
 * Garante que todas as operações são filtradas por user_id
 */

/**
 * Middleware que adiciona req.userId para facilitar acesso
 * e valida que o usuário está autenticado
 */
const requireUserId = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
  }

  // Adicionar helper req.userId
  req.userId = req.user.id;
  next();
};

/**
 * Valida que um recurso pertence ao usuário
 * @param {Function} getResourceOwnerId - Função que retorna o user_id do recurso
 */
const validateOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (!resourceOwnerId) {
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado'
        });
      }

      if (resourceOwnerId !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este recurso'
        });
      }

      next();
    } catch (error) {
      console.error('❌ Erro ao validar ownership:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao validar permissão'
      });
    }
  };
};

/**
 * Helper para construir queries com filtro de user_id
 * @param {string} baseQuery - Query base
 * @param {Array} params - Parâmetros existentes
 * @param {number} userId - ID do usuário
 * @returns {Object} - { query, params }
 */
const addUserIdFilter = (baseQuery, params = [], userId) => {
  if (!userId) {
    throw new Error('userId é obrigatório para filtrar dados');
  }

  // Verificar se já tem WHERE na query
  const hasWhere = /WHERE/i.test(baseQuery);
  const whereClause = hasWhere ? 'AND' : 'WHERE';
  
  const newQuery = `${baseQuery} ${whereClause} user_id = $${params.length + 1}`;
  const newParams = [...params, userId];

  return { query: newQuery, params: newParams };
};

/**
 * Helper para validar que userId do token corresponde ao userId do recurso
 */
const validateUserIdMatch = (req, resourceUserId) => {
  if (req.userId !== resourceUserId) {
    throw new Error('Usuário não autorizado a acessar este recurso');
  }
};

module.exports = {
  requireUserId,
  validateOwnership,
  addUserIdFilter,
  validateUserIdMatch
};
