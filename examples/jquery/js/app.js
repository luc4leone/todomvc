/* This challenge inspired me to try and reorganize the whole app. I followed Gordon's Practical JS app organization. I tried to avoid changing the single methods, my focus was on rearranging the methods, separating the 'view' object from the 'data' object connecting them through the 'logic' object */

jQuery(function($) {
    'use strict';

    var ENTER_KEY = 13; 
    var ESCAPE_KEY = 27;


/* ======= Template ======= */

    Handlebars.registerHelper('eq', function (a, b, options) {
        return a === b ? options.fn(this) : options.inverse(this);
    });


/* ======= Utilities ======= */

    var util = {
        uuid: function() {
            var i, random;
            var uuid = '';

            for (i = 0; i < 32; i++) {
                random = Math.random() * 16 | 0;
                    if (i === 8 || i === 12 || i === 16 || i === 20) {
                    uuid += '-';
                }
                uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
            }
            return uuid;
        },

        pluralize: function(count, word) {
            return count === 1 ? word : word + 's';
        }
    };


/* ======= Model ======= */

    var model = {
        todos: null,

        store: function(namespace, data) {
            if (arguments.length > 1) {
                return localStorage.setItem(namespace, JSON.stringify(data));
            } else {
                var store = localStorage.getItem(namespace);
                return (store && JSON.parse(store)) || [];
            }
        },

        create: function(title) { 
            model.todos.push({
                id: util.uuid(),
                title: title,
                completed: false
            });

            this.store('todos-jquery', this.todos);
        },

        toggle: function(i) {
            this.todos[i].completed = !this.todos[i].completed;
            this.store('todos-jquery', this.todos);
        },
        
        toogleAll: function(isChecked) {
            this.todos.forEach(function(todo) {
                todo.completed = isChecked;
        });

            this.store('todos-jquery', this.todos);
        }, 

        destroy: function(i) {
            this.todos.splice(i, 1);
            this.store('todos-jquery', this.todos);
        },

        update: function($el, val, i) {   
            if ($el.data('abort')) {
                $el.data('abort', false);
            } else if (!val) {
                this.destroy(i);
            } else { 
                this.todos[i].title = val;
            }
            
            this.store('todos-jquery', this.todos);
        }
    };


/* ======= View ======= */

    var view = {
        todoTemplate: null,
        footerTemplate: null,

        render: function() {
            var todos = controller.getFilteredTodos();
            $('#todo-list').html(this.todoTemplate(todos));
            $('#main').toggle(todos.length > 0);
            $('#toggle-all').prop('checked', controller.getActiveTodos().length === 0);
            this.renderFooter();
            $('#new-todo').focus();
        },

        renderFooter: function() {
            var todoCount = model.todos.length;
            var activeTodoCount = controller.getActiveTodos().length;
            var template = this.footerTemplate({
                activeTodoCount: activeTodoCount,
                activeTodoWord: util.pluralize(activeTodoCount, 'item'),
                completedTodos: todoCount - activeTodoCount,
                filter: controller.filter
            });

             $('#footer').toggle(todoCount > 0).html(template);
        },

        bindEvents: function() {
            $('#new-todo').on('keyup', controller.create);
            var toggleEl = document.querySelector('#toggle-all');
            $('#toggle-all').on('change', controller.toggleAll);
            $('#footer').on('click', '#clear-completed', controller.destroyCompleted.bind(controller));

            $('#todo-list')
                .on('change', '.toggle', controller.toggle.bind(controller))
                .on('dblclick', 'label', controller.edit)
                .on('keyup', '.edit', controller.editKeyup)
                .on('focusout', '.edit', controller.update.bind(controller))
                .on('click', '.destroy', controller.destroy.bind(controller));
        }
    };


/* ======= Controller ======= */

    var controller = {

        init: function() {
            model.todos = model.store('todos-jquery');

            view.todoTemplate = Handlebars.compile($('#todo-template').html());
            view.footerTemplate = Handlebars.compile($('#footer-template').html());

            view.bindEvents();

            new Router({
                '/:filter': function(filter) {
                    this.filter = filter;
                    view.render();
                }.bind(this)
            }).init('/all');
           },

        create: function(e) { 
            var $input = jQuery(e.target); 
            var val = $input.val().trim();

            if (e.which !== ENTER_KEY || !val) {
                return;
            }

            $input.val('');
            
            model.create(val);
            view.render();
        },

        getActiveTodos: function() {
            return model.todos.filter(function(todo) {
                return !todo.completed;
            });
        },

        getCompletedTodos: function() {
            return model.todos.filter(function(todo) {
                return todo.completed;
            });
        },

        getFilteredTodos: function() {
            if (this.filter === 'active') {
                return this.getActiveTodos();
            }

            if (this.filter === 'completed') {
                return this.getCompletedTodos();
            }

            return model.todos;
        },

        toggleAll: function(e) {
            var isChecked = $(e.target).prop('checked');
            
            model.toogleAll(isChecked);
            view.render();
        },

        destroyCompleted: function() {
            model.todos = this.getActiveTodos();
            this.filter = 'all';

            model.store('todos-jquery', model.todos);
            view.render();
        },

        indexFromEl: function(el) {
            var id = $(el).closest('li').data('id');
            var todos = model.todos;
            var i = todos.length;

            while (i--) {
                if (todos[i]['id'] === id) {
                    return i;
                }
            }
        },

        toggle: function(e) {
            var i = this.indexFromEl(e.target);

            model.toggle(i);
            view.render();
        },

        edit: function(e) {
            var $input = $(e.target).closest('li').addClass('editing').find('.edit');
            $input.val($input.val()).focus();
        },

        editKeyup: function(e) {
            if (e.which === ENTER_KEY) {
                e.target.blur();
            }
            if (e.which === ESCAPE_KEY) {
                $(e.target).data('abort', true).blur();
            }
        },

        update: function(e) {
            var $el = $(e.target);
            var val = $el.val().trim();
            var i = this.indexFromEl(e.target);

            model.update($el, val, i);
            view.render();
        },

        destroy: function(e) {
            model.destroy(this.indexFromEl(e.target));
            view.render();
        }
    };

    controller.init();
});
