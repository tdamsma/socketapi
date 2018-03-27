/* global io, Vue, Vuex, _ */
/* eslint-disable no-console, no-debugger */

const STORAGE_KEY = 'storage_key'

const localStoragePlugin = store => {
  store.subscribe((mutation, state) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  })
}
console.log(localStoragePlugin)

let localStorage = JSON.parse(window.localStorage.getItem(STORAGE_KEY))

const state = {
  items: _.get(localStorage, 'items', {}),
  pendingMutations: _.get(localStorage, 'pendingMutations', {})
}

const getters = {
  item: state => itemId => {
    return { id: itemId, data: state.items[itemId] }
  },
  items: (state, getters) => Object.keys(state.items).map(getters.item)
}

const mutations = {
  initializeItems(state, items) {
    Vue.set(state, 'items', items)
  },
  upsertItem(state, item) {
    console.log('upsertItem', item)
    Vue.set(state.pendingMutations, item.id, {
      action: 'upsert',
      when: new Date()
    })
    Vue.set(state.eventSourcedItems, item.id, item._state())
  },
  removeItem(state, item) {
    console.log('removeItem', item)
    Vue.set(state.pendingMutations, item.id, {
      action: 'remove',
      when: new Date()
    })
    Vue.set(state.eventSourcedItems[item.id].$meta, 'is_deleted', true)
  }
}

const store = new Vuex.Store({
  state,
  getters,
  mutations
})

new Vue({
  el: '#app',
  store,
  data: {
    connected: false,
    server_state: {},
    local_state: {},
    socket: 1
  },
  computed: {
    ...Vuex.mapGetters(['items']),
    title: () => (this.connected ? 'Connected' : 'Not connected')
  },
  methods: {
    ...Vuex.mapMutations(['initializeItems', 'upsertItem', 'removeItem']),
    edit: function(id, event) {
      let value = event.target.value
      this.upsertItem(id, { letters: value })

      this.socket.emit('update item', {
        id,
        value: {
          letters: value
        }
      })
    }
  },
  mounted: function() {
    window.this = this
    this.socket = io('http://127.0.0.1:5000/test')
    this.socket.on('connect', () => {
      console.log('connect')
      this.connected = true
      this.socket.emit('send items')
    })
    this.socket.on('disconnect', () => {
      console.log('disconnect')
      this.connected = false
    })
    this.socket.on('receive items', state => {
      console.log('receive items')
      this.initializeItems(state)
    })
    this.socket.on('update item', data => {
      console.log('update item', data)
      if (
        JSON.stringify(this.local_state[data['id']]) ===
        JSON.stringify(data.value)
      ) {
        this.$delete(this.local_state, data['id'])
        // tmp = this.server_state[data['id']]r
        // this.server_state[data['id']] = {}
        // this.$forceUpdate()
      } else {
        console.log(
          'state different:',
          this.local_state[data['id']],
          data.value
        )
      }
      this.server_state[data['id']] = data.value
    })
    this.socket.on('reject update', data => {
      console.log('reject update', data)
      if (
        JSON.stringify(this.local_state[data['id']]) ===
        JSON.stringify(data.rejected)
      ) {
        delete this.local_state[data['id']]
      }
    })
    this.socket.on('my response', data => {
      console.log('my response', data)
    })
  }
}) 
 