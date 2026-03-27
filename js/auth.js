/**
 * Auth System - Projeto V01
 * Gerencia login, logout e proteção de rotas.
 */

import { supabase } from './supabase-config.js';

const Auth = {
    /**
     * Tenta realizar o login do usuário
     */
    async login(nickname, password) {
        try {
            const { data, error } = await supabase
                .from('perfis_tripulantes')
                .select(`
                    *,
                    funcionarios!inner (
                        *,
                        setores!setor_id (nome),
                        cargos!cargo_id (nome, nivel)
                    )
                `)
                .ilike('nickname', nickname)
                .eq('senha', password)
                .single();

            if (error) {
                if (error.code === 'PGRST116') throw new Error('Credenciais inválidas ou usuário não encontrado.');
                throw error;
            }
            if (!data || !data.funcionarios) throw new Error('Credenciais inválidas.');

            // Checagem de primeiro acesso (senha = CPF)
            if (data.funcionarios.cpf) {
                const cpfNumbers = data.funcionarios.cpf.replace(/\D/g, '');
                if (password === cpfNumbers) {
                    localStorage.setItem('force_password_change', 'true');
                } else {
                    localStorage.removeItem('force_password_change');
                }
            }

            // Salvar no localStorage extraindo do JOIN
            const f = data.funcionarios;
            localStorage.setItem('userId', f.id);
            localStorage.setItem('userRole', f.nivel_acesso);
            localStorage.setItem('userName', f.nome_completo);
            localStorage.setItem('userNickname', data.nickname);
            localStorage.setItem('userMatricula', f.matricula);
            localStorage.setItem('userSetor', f.setores?.nome || 'Não definido');
            localStorage.setItem('userSetorId', f.setor_id || '');
            localStorage.setItem('userFuncao', f.cargos?.nome || f.funcao || 'Tripulante');
            localStorage.setItem('userCargoNivel', f.cargos?.nivel || 'N/A');

            console.log('Login bem-sucedido:', f.nome_completo);
            return { success: true, user: { ...f, nickname: data.nickname, foto_url: data.foto_url, senha: data.senha } };
        } catch (err) {
            console.error('Erro detalhado no login:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Finaliza a sessão atual
     */
    logout() {
        // Limpar apenas chaves de sessão, preservando preferências e marcadores de leitura (ciente_, visto_)
        const sessionKeys = [
            'userId', 'userRole', 'userName', 'userNickname', 
            'userMatricula', 'userSetor', 'userSetorId', 
            'userFuncao', 'userCargoNivel', 'force_password_change'
        ];
        sessionKeys.forEach(key => localStorage.removeItem(key));
        
        window.location.href = 'pagina_login_01.html';
    },

    /**
     * Verifica se existe uma sessão ativa. 
     * Se não existir, redireciona para o login.
     * @param {string[]} allowedRoles Níveis de acesso permitidos (opcional)
     */
    checkSession(allowedRoles = []) {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');

        // Se não estiver logado
        if (!userId) {
            window.location.href = 'pagina_login_01.html';
            return;
        }

        // Se estiver forçado a mudar a senha e não estiver na página de perfil
        if (localStorage.getItem('force_password_change') === 'true' && !window.location.pathname.includes('perfil_funcionario.html')) {
            window.location.href = 'perfil_funcionario.html';
            return;
        }

        // Se a rota for restrita a certos papéis
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
            // Se o usuário não tiver permissão para a tela atual
            alert('Acesso negado: Nível de autorização insuficiente.');

            // Redireciona para o Dashboard Único
            window.location.href = 'dashboard.html';
        }

        return { userId, userRole };
    },

    /**
     * Retorna os dados do usuário atual
     */
    getUser() {
        return {
            id: localStorage.getItem('userId'),
            role: localStorage.getItem('userRole'),
            name: localStorage.getItem('userName'),
            nickname: localStorage.getItem('userNickname'),
            matricula: localStorage.getItem('userMatricula'),
            setor: localStorage.getItem('userSetor'),
            setorId: localStorage.getItem('userSetorId'),
            funcao: localStorage.getItem('userFuncao'),
            funcaoNivel: localStorage.getItem('userCargoNivel')
        };
    }
};

export { Auth };
window.Auth = Auth;
