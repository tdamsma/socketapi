/* global io, Vue, Vuex, _ */
/* eslint-disable no-console, no-debugger */

const STORAGE_KEY = 'storage_key'

const localStoragePlugin = store => {
  store.subscribe((mutation, state) => {
    console.log('localStorage')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  })
}
console.log(localStoragePlugin)

let localStorage = JSON.parse(window.localStorage.getItem(STORAGE_KEY))

let socket = io('http://127.0.0.1:5000/test')
socket.on('connect', () => {
  store.commit('connect')
  push_mutations()  
  socket.emit('send items')
})
socket.on('disconnect', () => {
  store.commit('disconnect')
  mutations.disconnect(state)
})
socket.on('receive items', items => {
  store.commit('initializeItems',items)
})
socket.on('update item', item => {
  store.commit('upsertItemServer',item)
})
socket.on('reject update', rejection => {
  console.log('reject update', rejection )
})

const state = {
  items_server: _.get(localStorage, 'items_server', {}),
  items_local: _.get(localStorage, 'items_local', {}),
  connected: false
}

const getters = {
  connected: state => state.connected,
  items: state => Object.assign(state.items_server, state.items_local),
  item: (state, getters) => itemId => getters.items[itemId],
  item_list: (state, getters) => Object.keys(getters.items).map(getters.item),
  mutated_item: state => itemId => state.items_local[itemId],
  mutated_item_list: state =>
    Object.keys(state.items_local).map(itemId => state.items_local[itemId])
}

const mutations = {
  connect(state) {
    console.log('mutation: connect')
    Vue.set(state, 'connected', true)
  },
  disconnect(state) {
    console.log('mutation: disconnect')
    Vue.set(state, 'connected', false)
  },
  initializeItems(state, items) {
    console.log('mutation: initializeItems')
    Vue.set(state, 'items_server', items)
  },
  upsertItemLocal(state, item) {
    console.log('mutation: upsertItemLocal', JSON.stringify(item))
    Vue.set(state.items_local, item.id, item)
    push_mutations()
  },

  upsertItemServer(state, item) {
    console.log('mutation: upsertItemServer', JSON.stringify(item))
    Vue.set(state.items_server, item.id, item)

    if (
      item.id in state.items_local &&
      _.isEqual(
        state.items_server[item.id].data,
        state.items_local[item.id].data
      )
    ) {
      Vue.delete(state.items_local, item.id)
    }
  }
}

function push_mutations() {
  for (let item of getters.mutated_item_list(state)) {
    console.log(JSON.stringify(item))
    setTimeout(
      () => socket.emit('update item', item),
      Math.floor(Math.random() * 0)
    )
  }
}

const store = new Vuex.Store({
  state,
  getters,
  mutations
})

localStoragePlugin(store)

Vue.component('item', {
  template: `
  <div>
  <p> ID: {{item.id}} modified: <i>{{item.modified}}</i></p> 
  <input type="text"  v-model="letters"></input>
  <input type="number" v-model="number"></input>
  </div>`,
  props: ['item'],
  computed: {
    letters: {
      get() {
        return this.item.data.letters
      },
      set(letters) {
        this.$store.commit(
          'upsertItemLocal',
          _.merge(this.item, { data: { letters } })
        )
      }
    },
    number: {
      get() {
        return this.item.data.number
      },
      set(number) {
        this.$store.commit(
          'upsertItemLocal',
          _.merge(this.item, { data: { number } })
        )
      }
    }
  }
})

new Vue({
  el: '#app',
  template: `
  <div>      
  <h1>{{title}}</h1>
  <ul>
    <li v-for="item in item_list">
      <item :item="item" />
    </li>
  </ul>

  <h2>Mutated</h2>
  <ul>
    <li v-for="item in mutated_item_list">
      <item :item="item" />
    </li>
  </ul>
  </div>`,
  store,
  data: {},
  computed: {
    ...Vuex.mapGetters(['connected', 'item_list', 'mutated_item_list']),
    title: function() {
      return this.connected ? 'Connected' : 'Not connected'
    }
  },
  methods: {
    ...Vuex.mapMutations(['initializeItems', 'upsertItem', 'removeItem']),
    edit: function(id, event) {
      let value = event.target.value
      this.upsertItem(id, { letters: value })
    }
  },
  mounted: function() {
    window.this = this
  }
})
